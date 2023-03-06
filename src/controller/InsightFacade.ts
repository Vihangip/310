import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError
} from "./IInsightFacade";
import * as fs from "fs-extra";

import {InsightDatasetExpanded, SectionFacade} from "./SectionFacade";
import JSZip from "jszip";
import QueryBuilder from "./QueryBuilder";


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

	private fileStringToSectionArray(fileString: string) {
		if (fileString.trim().length === 0) {
			return [];
		}
		let sections = [];
		let jsonified = JSON.parse(fileString);
		for (let section of jsonified.result) {
			// todo check if any of these are undefined
			let newSection: SectionFacade = {
				audit: section.Audit,
				avg: section.Avg,
				dept: section.Subject,
				fail: section.Fail,
				id: section.Course,
				instructor: section.Professor,
				pass: section.Pass,
				title: section.Title,
				uuid: section.id,
				year: section.Year
			};
			sections.push(newSection);
			// todo file persistence
			// fs.outputJson("/data/" + id + "/" + section.id + ".json", newSection)
			//	.catch((err) => {
			//		console.error(err);
			//	 });
		}
		return sections;
	}

	private sectionArraysToDataset(sectionArrays: SectionFacade[][], id: string, kind: InsightDatasetKind) {
		let sections = sectionArrays.flat();

		let newDataset: InsightDatasetExpanded = {
			id: id,
			kind: kind,
			numRows: sections.length,
			sections: sections
		};

		return newDataset;
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
								let sections = this.fileStringToSectionArray(fileString);
								resolve(sections);
							});
					}));
			}

			return new Promise<void>((resolve, reject) => {
				Promise.all(promises).then((sectionArrays) => {
					let newDataset = this.sectionArraysToDataset(sectionArrays, id, kind);
					if (id in this.datasets) {
						reject(new InsightError("Invalid id: id already exists"));
					} else {
						this.datasets[id] = newDataset;
						resolve();
					}
				});
			});
		}
	}

	private async handleZip(id: string, content: string, kind: InsightDatasetKind) {
		// unzip, parse content
		let zip = new JSZip();

		return new Promise<void>((resolve, reject) => {
			zip.loadAsync(content, {base64: true})
				.then((z) => {
					this.handleJSON(id, kind, z)
						.then(() => {
							resolve();
						})
						.catch((err) => {
							reject(err);
						});
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
			let queryObj = queryBuilder.isValid(query);
			let idString = queryBuilder.getId();

			if (queryObj) { // query is valid
				if (idString === null) {
					reject(new InsightError("Dataset does not exist: id is null"));
				}

				if (!Object.keys(this.datasets).includes(idString)) {
					reject(new InsightError("Dataset does not exist: dataset has not been added"));
				}

				let dataset = this.datasets[idString];

				if (queryObj.isWhereEmpty()) {
					if (dataset.sections.length > this.maxNumResults) {
						reject(new ResultTooLargeError(
							"Excess keys in query: where is empty and the dataset is too large"));
					}
				}

				let results = queryObj.run(dataset);
				if (results.length > this.maxNumResults) {
					reject(new ResultTooLargeError("Excess keys in query: too many things are being searched for"));
				}
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
