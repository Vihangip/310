// interface that represents a single filter. contains a filter list that
// can be empty or not
export interface Filter {
	run(): void;
}

export class MComparisonFilter implements Filter {
	private idString: string; // id of dataset
	private mField: string; // avg, pass, fail...
	private compValue: number; // number to compare against

	constructor(idString: string, mField: string, compValue: number) {
		this.idString = idString;
		this.mField = mField;
		this.compValue = compValue;
	}

	public run(): void {
		return;
	}
}

// top level query (can only have one filter in it)
export interface Query {
	filter: Filter;
}
