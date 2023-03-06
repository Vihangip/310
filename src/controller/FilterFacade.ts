// interface that represents a single filter. contains a filter list that
// can be empty or not
import {InsightResult} from "./IInsightFacade";
import {InsightDatasetExpanded, SectionFacade} from "./SectionFacade";

export abstract class Filter {
	protected kind: string;
	protected constructor(kind: string) {
		this.kind = kind;
	}

	public abstract run(dataset: InsightDatasetExpanded): number[];

	public static getSectionInfo(section: SectionFacade, member: string): number | string | null {
		switch (member) {
			case "uuid":
				return section.uuid;
			case "id":
				return section.id;
			case "title":
				return section.title;
			case "instructor":
				return section.instructor;
			case "dept":
				return section.dept;
			case "year":
				return section.year;
			case "avg":
				return section.avg;
			case "pass":
				return section.pass;
			case "fail":
				return section.fail;
			case "audit":
				return section.audit;
			default:
				throw new Error("Unknown member");
		}
	}
}

export class EmptyFilter extends Filter {
	constructor(kind: string) {
		super(kind);
	}

	public run(): number[] {
		return [];
	}
}

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

	public run(dataset: InsightDatasetExpanded): number[] {
		let indices: number[] = [];
		switch (this.kind) {
			case "GT":
				for (let i = 0; i < dataset.sections.length; i++) {
					let sectionInfo = Filter.getSectionInfo(dataset.sections[i], this.mField);
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
					let sectionInfo = Filter.getSectionInfo(dataset.sections[i], this.mField);
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
					let sectionInfo = Filter.getSectionInfo(dataset.sections[i], this.mField);
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

	public run(dataset: InsightDatasetExpanded): number[] {
		let indices: number[] = [];
		for (let i = 0; i < dataset.sections.length; i++) {
			let sectionInfo = Filter.getSectionInfo(dataset.sections[i], this.sField);
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

export class LogicComparisonFilter extends Filter {
	private filterList: Filter[]; // sub-filters
	constructor(kind: string, filterList: Filter[]) {
		super(kind);
		this.filterList = filterList;
	}

	public run(dataset: InsightDatasetExpanded): number[] {
		let indices: number[] = [];
		let indexSet = new Set<number>();
		switch (this.kind) {
			case "AND":
				indices = this.filterList[0].run(dataset);
				for (let i = 1; i < this.filterList.length; i++) {
					let results = this.filterList[i].run(dataset);
					results = results.filter((result) => {
						return indices.includes(result);
					});
					indices = indices.filter((index) => {
						return results.includes(index);
					});
				}
				return indices;
			case "OR":
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

export class NegationFilter extends Filter {
	private filter: Filter; // only has one filter
	constructor(kind: string, filter: Filter) {
		super(kind);
		this.filter = filter;
	}

	public run(dataset: InsightDatasetExpanded): number[] {
		let indices: number[] = [];
		let results = this.filter.run(dataset);
		if (results.length === 0) {
			return dataset.sections.map((section, index) => {
				return index;
			});
		}
		results.sort((a, b) => {
			return a - b;
		});
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

// top level query (can only have one filter in it)
export class Query {
	private filter: Filter;
	private columns: string[]; // only the fields, because you can only have one dataset
	private order: string | null; // only a field as above, null if order doesn't matter
	constructor(filter: Filter, columns: string[], order: string | null) {
		this.filter = filter;
		this.columns = columns;
		this.order = order;
	}

	public run(dataset: InsightDatasetExpanded): InsightResult[] {
		let indices = this.filter.run(dataset);
		let results = indices.map((index) => {
			let section = dataset.sections[index];
			let sectionInfo: InsightResult = {};
			for (let column of this.columns) {
				let key = dataset.id + "_" + column;
				let val = Filter.getSectionInfo(section, column);
				if(val !== null) {
					sectionInfo[key] = val;
				}
			}
			return sectionInfo;
		});

		if(this.order) {
			results.sort((a, b) => {
				if(a && b) {
					if (a[dataset.id + "_" + this.order] < b[dataset.id + "_" + this.order]) {
						return -1;
					} else if (a[dataset.id + "_" + this.order] > b[dataset.id + "_" + this.order]) {
						return 1;
					}
					return 0;
				}
				return 0;
			});
		}
		return results;
	}

	public isWhereEmpty() {
		return this.filter instanceof EmptyFilter;
	}
}
