import {InsightResult} from "./IInsightFacade";
import {InsightDatasetExpanded, SectionFacade} from "./DatasetFacade";
import QueryHelper from "./QueryHelper";

export abstract class Filter {
	protected kind: string; // GT, LT, EQ, IS...
	protected constructor(kind: string) {
		this.kind = kind;
	}

	public abstract run(dataset: InsightDatasetExpanded): number[];
}

// if WHERE is empty, this is the filter assigned to the main Query object
export class EmptyFilter extends Filter {
	constructor(kind: string) {
		super(kind);
	}

	public run(): number[] {
		return [];
	}
}

// custom Filter object for m comparison
export class MComparisonFilter extends Filter {
	private idString: string; // id of dataset
	private mField: string; // avg, pass, fail...
	private compValue: number; // number to compare against

	constructor(kind: string, idString: string, mField: string, compValue: number) {
		super(kind);
		this.idString = idString;
		this.mField = mField;
		this.compValue = compValue;
	}

	// produce a list of indices (numbers) in the dataset's sections array that satisfy the comparison
	public run(dataset: InsightDatasetExpanded): number[] {
		let indices: number[] = [];
		switch (this.kind) {
			case "GT":
				for (let i = 0; i < dataset.sections.length; i++) {
					let sectionInfo = QueryHelper.getSectionInfo(dataset.sections[i], this.mField);
					if (sectionInfo === null || typeof sectionInfo === "string") {
						throw new Error("Unexpected section member datatype: " + this.mField);
					}
					if (sectionInfo > this.compValue) {
						indices.push(i);
					}
				}
				return indices;
			case "LT":
				for (let i = 0; i < dataset.sections.length; i++) {
					let sectionInfo = QueryHelper.getSectionInfo(dataset.sections[i], this.mField);
					if (sectionInfo === null || typeof sectionInfo === "string") {
						throw new Error("Unexpected section member datatype: " + this.mField);
					}
					if (sectionInfo < this.compValue) {
						indices.push(i);
					}
				}
				return indices;
			case "EQ":
				for (let i = 0; i < dataset.sections.length; i++) {
					let sectionInfo = QueryHelper.getSectionInfo(dataset.sections[i], this.mField);
					if (sectionInfo === null || typeof sectionInfo === "string") {
						throw new Error("Unexpected section member datatype: " + this.mField);
					}
					if (sectionInfo === this.compValue) {
						indices.push(i);
					}
				}
				return indices;
			default:
				return indices;
		}
	}
}

// custom Filter object for s comparison
export class SComparisonFilter extends Filter {
	private idString: string; // id of dataset
	private sField: string; // dept, id...
	private inputString: RegExp; // regex to compare against

	constructor(kind: string, idString: string, sField: string, inputString: RegExp) {
		super(kind);
		this.idString = idString;
		this.sField = sField;
		this.inputString = inputString;
	}

	// produce a list of indices (numbers) in the dataset's sections array that satisfy the comparison
	public run(dataset: InsightDatasetExpanded): number[] {
		let indices: number[] = [];
		for (let i = 0; i < dataset.sections.length; i++) {
			let sectionInfo = QueryHelper.getSectionInfo(dataset.sections[i], this.sField);
			if (sectionInfo === null || typeof sectionInfo === "number") {
				throw new Error("Unexpected section member datatype: " + this.sField);
			}
			if (sectionInfo.match(this.inputString)) {
				indices.push(i);
			}
		}
		return indices;
	}
}

// custom Filter object for logic comparison
export class LogicComparisonFilter extends Filter {
	private filterList: Filter[]; // sub-filters
	constructor(kind: string, filterList: Filter[]) {
		super(kind);
		this.filterList = filterList;
	}

	/*
	produce a list of indices (numbers) in the dataset's sections array that satisfy the comparison.
	need to call all sub-filters in filter list recursively first
	 */
	public run(dataset: InsightDatasetExpanded): number[] {
		let indices: number[] = [];
		let indexSet = new Set<number>();
		switch (this.kind) {
			case "AND":
				// indices = indices obtained "so far" (when going through past filters)
				indices = this.filterList[0].run(dataset);
				for (let i = 1; i < this.filterList.length; i++) {
					// results = indices obtained when looking at this specific filter
					let results = this.filterList[i].run(dataset);
					// only take ones that are in both
					results = results.filter((result) => {
						return indices.includes(result);
					});
					indices = results;
				}
				return indices;
			case "OR":
				/*
				sets basically work like OR, you can only have one copy of each item (duplicates will be ignored)
				so we add every index that works with the filter to a set and then convert that set to a list
				 */
				for (let item of this.filterList) {
					let results = item.run(dataset);
					for (let result of results) {
						indexSet.add(result);
					}
				}
				indices = Array.from(indexSet);
				indices.sort();
				return indices;
			default:
				return indices;
		}
	}
}

// custom Filter object for negation
export class NegationFilter extends Filter {
	private filter: Filter; // only has one filter
	constructor(kind: string, filter: Filter) {
		super(kind);
		this.filter = filter;
	}

	/*
	produce a list of indices (numbers) in the dataset's sections array that satisfy the comparison.
	need to call all sub-filters in sub-filter recursively first
	 */
	public run(dataset: InsightDatasetExpanded): number[] {
		let indices: number[] = [];
		// results = all indices that work with any sub-filters
		let results = this.filter.run(dataset);
		if (results.length === 0) {
			return dataset.sections.map((section, index) => {
				return index;
			});
		}
		/*
		sort the results, so we don't have to go searching through the whole array each time
		and can instead just count through the array once
		 */
		results.sort((a, b) => {
			return a - b;
		});
		// count through the possible indices, saving only indices that are NOT in results (sub-filters do not apply)
		let end = results[0];
		let currentResult = 0;
		for (let i = 0; i < dataset.sections.length; i++) {
			if (i < end) {
				indices.push(i);
			} else {
				currentResult++;
				if (currentResult < results.length) {
					end = results[currentResult];
				} else {
					end = dataset.sections.length;
				}
			}
		}
		return indices;
	}
}

// top level query object (can only have one filter in it)
export class Query {
	private filter: Filter;
	private columns: string[]; // only the fields, because you can only have one dataset
	private anyKeyList: any;
	private direction: string | null; // only a field as above, null if order doesn't matter
	constructor(filter: Filter, columns: string[], anyKeyList: any[] | null, direction: string | null) {
		this.filter = filter;
		this.columns = columns;
		this.anyKeyList = anyKeyList;
		this.direction = direction;
	}

	// returns true if query's WHERE doesn't have a filter in it
	public isWhereEmpty() {
		return this.filter instanceof EmptyFilter;
	}

	// given a dataset, recurses through the query's filter and any sub-filters to find the entries that satisfy it
	public run(dataset: InsightDatasetExpanded): InsightResult[] {
		/*
		recursive step, runs all sub-filters first to get a list of indices (numbers)
		in the dataset's list of sections that work
		*/
		let indices = this.filter.run(dataset);
		/*
		turn the list of indices into a list of InsightResult objects.
		each object contains only the mfields/sfields in columns
		*/
		let results = indices.map((index) => {
			let section = dataset.sections[index];
			let sectionInfo: InsightResult = {};
			for (let column of this.columns) {
				let key = dataset.id + "_" + column;
				let val = QueryHelper.getSectionInfo(section, column);
				if(val !== null) {
					sectionInfo[key] = val;
				}
			}
			return sectionInfo;
		});
		// now sort the list of objects if needed
		// if(this.order) {
		// 	results.sort((a, b) => {
		// 		if(a && b) {
		// 			if (a[dataset.id + "_" + this.order] < b[dataset.id + "_" + this.order]) {
		// 				return -1;
		// 			} else if (a[dataset.id + "_" + this.order] > b[dataset.id + "_" + this.order]) {
		// 				return 1;
		// 			}
		// 			return 0;
		// 		}
		// 		return 0;
		// 	});
		// }
		return results;
	}
}
