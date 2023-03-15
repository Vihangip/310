import {InsightResult} from "./IInsightFacade";
import {InsightDatasetExpanded, SectionFacade} from "./DatasetFacade";
import QueryHelper from "./QueryHelper";
import FacadeHelper from "./FacadeHelper";
import TransformHelper from "./TransformHelper";

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
		const filterFn = (value: any, compValue: any, operator: string) => {
			if (value === null || typeof value === "string") {
				throw new Error("Unexpected section member datatype: " + this.mField);
			}
			switch (operator) {
				case "GT":
					return value > compValue;
				case "LT":
					return value < compValue;
				case "EQ":
					return value === compValue;
				default:
					return false;
			}
		};

		const indices: number[] = [];
		try {
			for (let i = 0; i < dataset.sections.length; i++) {
				const value = QueryHelper.getSectionInfo(dataset.sections[i], this.mField);
				if (filterFn(value, this.compValue, this.kind)) {
					indices.push(i);
				}
			}
		} catch (e) {
			for (let i = 0; i < dataset.rooms.length; i++) {
				const value = QueryHelper.getRoomInfo(dataset.rooms[i], this.mField);
				if (filterFn(value, this.compValue, this.kind)) {
					indices.push(i);
				}
			}
		}
		return indices;
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
		try {
			for (let i = 0; i < dataset.sections.length; i++) {
				let sectionInfo = QueryHelper.getSectionInfo(dataset.sections[i], this.sField);
				if (sectionInfo === null || typeof sectionInfo === "number") {
					throw new Error("Unexpected section member datatype: " + this.sField);
				}
				if (sectionInfo.match(this.inputString)) {
					indices.push(i);
				}
			}
		} catch (e) {
			for (let i = 0; i < dataset.rooms.length; i++) {
				let roomInfo = QueryHelper.getRoomInfo(dataset.rooms[i], this.sField);
				if (roomInfo === null || typeof roomInfo === "number") {
					throw new Error("Unexpected section member datatype: " + this.sField);
				}
				if (roomInfo.match(this.inputString)) {
					indices.push(i);
				}
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
		try {
			if (results.length === 0) {
				return dataset.sections.map((section, index) => {
					return index;
				});
			}
		} catch (e) {
			if (results.length === 0) {
				return dataset.rooms.map((section, index) => {
					return index;
				});
			}
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
		try {
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
		} catch (e) {
			for (let i = 0; i < dataset.rooms.length; i++) {
				if (i < end) {
					indices.push(i);
				} else {
					currentResult++;
					if (currentResult < results.length) {
						end = results[currentResult];
					} else {
						end = dataset.rooms.length;
					}
				}
			}
		}
		return indices;
	}
}

// top level query object (can only have one filter in it)
export default class Query {
	private filter: Filter;
	private idString: string;
	private columns: string[]; // only the fields, because you can only have one dataset
	private anyKeyList: any;
	private groupKeys: any;
	private applyTokens: any;
	private keyFields: any;
	private direction: string | null; // only a field as above, null if order doesn't matter

	private applyKeys: any;
	constructor(idString: string, filter: Filter, columns: string[], anyKeyList: any[] | null, direction: string | null,
		groupKeys: any[] | null, applyTokens: any[] | null, keyFields: any[] | null, applyKeys: string[] | null) {
		this.idString = idString;
		this.filter = filter;
		this.columns = columns;
		this.anyKeyList = anyKeyList;
		this.direction = direction;
		this.groupKeys = groupKeys;
		this.applyTokens = applyTokens;
		this.keyFields = keyFields;
		this.applyKeys = applyKeys;
	}

	// returns true if query's WHERE doesn't have a filter in it
	public isWhereEmpty() {
		return this.filter instanceof EmptyFilter;
	}

	// given a dataset, recurses through the query's filter and any sub-filters to find the entries that satisfy it
	public run(dataset: InsightDatasetExpanded): InsightResult[] {
		let outputResults = [];
		let transformedResults: any;
		let results: any;
		// recursive step, runs all sub-filters first to get a list of indices (numbers) in the dataset's list of sections that work
		let indices = this.filter.run(dataset);

		if (this.groupKeys.length !== 0) {
			let groupedResults = FacadeHelper.groupResults(this.groupKeys, indices, dataset);
			transformedResults = TransformHelper.applyTransformations(groupedResults, this.applyTokens, this.keyFields);
			results = FacadeHelper.getResults(this.idString, this.columns, this.applyKeys, transformedResults,
				groupedResults);
		} else {
			// turn the list of indices into a list of InsightResult objects. each object contains only the mfields/sfields in columns
			results = indices.map((index) => {
				try {
					return FacadeHelper.convertSectIndices(dataset,index,this.columns);
				} catch (e) {
					return FacadeHelper.convertRoomIndices(dataset,index,this.columns);
				}
			});
		}
		if (this.anyKeyList !== null) {
			outputResults = FacadeHelper.sortOptions(this.direction, this.anyKeyList, results);
		} else {
			outputResults = results;
		}
		return outputResults;
	}
}
