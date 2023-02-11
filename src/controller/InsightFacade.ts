import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import * as fs from "fs";
import JSON = Mocha.reporters.JSON;

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	// InsightDataset[] variable stores added datasets
	private datasets: InsightDataset[];

	// Set up InsightDataset[] variable
	constructor() {
		this.datasets = [];
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (id.trim().length === 0 || id.includes("_")) {
			return Promise.reject(new InsightError("Invalid id: only whitespace or contains underscore"));
		}

		if (this.datasets.find((dataset) => dataset.id === id) !== undefined) {
			return Promise.reject(new InsightError("Invalid id: id already exists"));
		}

		// checking disk
		if (fs.existsSync("./data/" + id + ".txt")) {
			return Promise.reject(new InsightError("Invalid id: id already exists"));
		}

		fs.writeFileSync("./data/" + id + ".txt", content);
		let newDataset: InsightDataset = {
			id: id,
			kind: kind,
			numRows: 0
		};
		this.datasets.push(newDataset);

		return Promise.reject("todo"); // todo

		// return Promise.resolve(fs.readdir("./data"));
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
