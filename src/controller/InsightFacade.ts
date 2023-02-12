import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import * as fs from "fs";

import {InsightDatasetExpanded, SectionFacade} from "./SectionFacade";
import JSZip from "jszip";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	// InsightDataset[] variable stores added datasets
	private datasets: InsightDatasetExpanded[];

	// Set up InsightDatasetExpanded[] variable
	constructor() {
		this.datasets = [];
		console.log("InsightFacadeImpl::init()");
	}

	private handleJSON(id: string, kind: InsightDatasetKind, z: JSZip) {
		if (z !== null) {
			let newDataset: InsightDatasetExpanded = {
				id: id,
				kind: kind,
				numRows: 0,
				sections: []
			};
			z.forEach(function (relativePath, file) {
				file.async("string")
					.then(function (fileString) {
						let jsonified = JSON.parse(fileString);
						let newSection: SectionFacade = {
							audit: jsonified.audit,
							avg: jsonified.avg,
							dept: jsonified.dept,
							fail: jsonified.fail,
							id: jsonified.id,
							instructor: jsonified.id,
							pass: jsonified.pass,
							title: jsonified.title,
							uuid: jsonified.uuid,
							year: jsonified.year
						};
						newDataset.sections.push(newSection);
						newDataset.numRows++;
					});
			});
			this.datasets.push(newDataset);
		}
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// verify that id is ok
		if (id.trim().length === 0 || id.includes("_")) {
			return Promise.reject(new InsightError("Invalid id: only whitespace or contains underscore"));
		}

		if (this.datasets.find((dataset) => dataset.id === id) !== undefined) {
			return Promise.reject(new InsightError("Invalid id: id already exists"));
		}

		// checking disk
		if (fs.existsSync("./data/" + id)) {
			return Promise.reject(new InsightError("Invalid id: id already exists"));
		}

		// unzip, parse content
		let zip = new JSZip();


		zip.loadAsync(content, {base64: true})
			.then((z) => {
				this.handleJSON(id, kind, z);
			});

		// write to file TODO

		/*
		 fs.writeFileSync("./data/" + id + ".txt", content);
		 */

		return Promise.reject("todo"); // todo
	}


	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}

}
