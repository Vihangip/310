import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import * as fs from "fs-extra";

import {InsightDatasetExpanded, RoomFacade, SectionFacade} from "./DatasetFacade";
import JSZip, {JSZipObject} from "jszip";
import QueryBuilder from "./QueryBuilder";
import SectionHelper from "./SectionHelper";
import {parse} from "parse5";
import RoomHelper from "./RoomHelper";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	// stores added datasets
	private datasets: {[id: string]: InsightDatasetExpanded};
	private maxNumResults = 5000;

	// Set up variable
	constructor() {
		this.datasets = {};
		console.log("InsightFacadeImpl::init()");
	}

	/*
	The zip file seems to be organized into:
	courses
		CPSC110
			Section 101
			Section 102
			...
		CPSC210
			Section 101
			Section 102
			...
		...
	so here I am iterating over individual files
	and then within those files iterating over sections.
	 */
	private async handleJSON(id: string, kind: InsightDatasetKind, z: JSZip) {
		if (z !== null) {
			let promises: Array<Promise<SectionFacade[]>> = [];

			let filteredFiles = z.filter(function (relativePath, file){
				return relativePath.startsWith("courses/");
			});

			if (filteredFiles.length === 0) {
				return Promise.reject(new InsightError("Invalid content: not within a courses folder"));
			}

			for (let file of filteredFiles) {
				promises.push(
					new Promise((resolve, reject) => {
						file.async("string")
							.then((fileString) => {
								let sections = SectionHelper.fileStringToSectionArray(fileString);
								resolve(sections);
							})
							.catch((err) => {
								reject(err);
							});
					}));
			}

			return new Promise<void>((resolve, reject) => {
				Promise.all(promises)
					.then((sectionArrays) => {
						let newDataset = SectionHelper.sectionArraysToDataset(sectionArrays, id, kind);
						if (id in this.datasets) {
							reject(new InsightError("Invalid id: id already exists"));
						} else {
							this.datasets[id] = newDataset;
							resolve();
						}
					})
					.catch((err) => {
						reject(err);
					});
			});
		}
	}

	private async handleHTM(id: string, kind: InsightDatasetKind, z: JSZip) {
		if (z !== null) {
			let indexFile = z.file("index.htm");
			if (!indexFile) {
				return Promise.reject(new InsightError("Invalid content: no index.htm file"));
			}
			let index = await indexFile.async("string");
			let promises: Array<Promise<RoomFacade[]>> = [];
			try {
				promises = RoomHelper.getRoomPromises(index, z);
			} catch (err) {
				return Promise.reject(err);
			}


			/*
			return new Promise<void>((resolve, reject) => {
				Promise.all(promises)
					.then((sectionArrays) => {
						let newDataset = SectionHelper.sectionArraysToDataset(sectionArrays, id, kind);
						if (id in this.datasets) {
							reject(new InsightError("Invalid id: id already exists"));
						} else {
							this.datasets[id] = newDataset;
							resolve();
						}
					})
					.catch((err) => {
						reject(err);
					});
			});
			 */
		}
	}

	private async handleZip(id: string, content: string, kind: InsightDatasetKind) {
		// unzip, parse content
		let zip = new JSZip();

		return new Promise<void>((resolve, reject) => {
			zip.loadAsync(content, {base64: true})
				.then((z) => {
					if (kind === InsightDatasetKind.Sections) {
						this.handleJSON(id, kind, z)
							.then(() => {
								resolve();
							})
							.catch((err) => {
								reject(err);
							});
					} else {
						this.handleHTM(id, kind, z)
							.then(() => {
								resolve();
							})
							.catch((err) => {
								reject(err);
							});
					}
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// verify that id is ok
		if (id.trim().length === 0 || id.includes("_")) {
			return Promise.reject(new InsightError("Invalid id: only whitespace or contains underscore"));
		}

		// verify that content is a string with length > 0
		if (content.trim().length === 0) {
			return Promise.reject(new InsightError("Invalid content: no content"));
		}

		// checking disk
		return new Promise<string[]>((resolve, reject) => {
			fs.pathExists("./data/" + id)
				.then((exists) => {
					if (exists) {
						reject(new InsightError("Invalid id: id already exists"));
					}
					this.handleZip(id, content, kind)
						.then(() => {
							resolve(Object.keys(this.datasets));
						})
						.catch((err) => {
							reject(err);
						});
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	public removeDataset(id: string): Promise<string> {
		// verify that id is ok
		if (id.trim().length === 0 || id.includes("_")) {
			return Promise.reject(new InsightError("Invalid id: only whitespace or contains underscore"));
		}

		if (id in this.datasets) {
			delete this.datasets[id];
			return Promise.resolve(id);
		} else {
			return Promise.reject(new NotFoundError("Invalid id: dataset does not exist"));
		}
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise<InsightResult[]>( (resolve, reject) => {
			let queryBuilder = new QueryBuilder();
			let queryObj = queryBuilder.build(query);
			let idString = queryBuilder.getId();

			if (queryObj) { // if the query is valid, it will not be null
				// make sure that the dataset is good
				if (idString === null) {
					reject(new InsightError("Dataset does not exist: id is null"));
				}

				if (!Object.keys(this.datasets).includes(idString)) {
					reject(new InsightError("Dataset does not exist: dataset has not been added"));
				}

				let dataset = this.datasets[idString];

				// verify before you start the querying process that an empty where won't cause issues
				if (queryObj.isWhereEmpty()) {
					if (dataset.sections.length > this.maxNumResults) {
						reject(new ResultTooLargeError(
							"Excess keys in query: where is empty and the dataset is too large"));
					}
				}

				// run recursively through the query's filters
				let results = queryObj.run(dataset);

				// make sure that the result isn't too long
				if (results.length > this.maxNumResults) {
					reject(new ResultTooLargeError("Excess keys in query: too many things are being searched for"));
				}

				// all good!
				resolve(results);

			} else { // query is invalid
				reject(new InsightError("Invalid query"));
			}
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let smallerDatasets: InsightDataset[] = [];
		for (let datasetKey in this.datasets) {
			let smallerDataset: InsightDataset = {
				id: this.datasets[datasetKey].id,
				kind: this.datasets[datasetKey].kind,
				numRows: this.datasets[datasetKey].numRows
			};
			smallerDatasets.push(smallerDataset);
		}
		return Promise.resolve(smallerDatasets);
	}

}
