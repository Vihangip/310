
export default class IsQueryValid {

	private id: string;
	private mKeyCorrectValues;
	private sKeyCorrectValues;

	constructor() {
		console.log("Checking if query is valid");
		this.id = "";
		this.mKeyCorrectValues = ["avg", "pass", "fail", "audit", "year"];
		this.sKeyCorrectValues = ["dept", "id", "instructor", "title", "uuid"];
	}

	public getId() {
		return this.id;
	}

	// can be only one dataset per query
	private setId(newId: string) {
		if (this.id === "") {
			this.id = newId;
		}
		if (this.id !== newId) {
			throw new Error("More than one dataset id in query");
		}
	}

	private isQueryKeysValid(query: any) {
		let correctKeys = ["WHERE", "OPTIONS"];
		let queryKeys = Object.keys(query);

		if (correctKeys.length !== queryKeys.length) {
			return false;
		}

		for (let correctKey of correctKeys) {
			if (!queryKeys.includes(correctKey)) {
				return false;
			}
		}
		return true;
	}

	private filterKeyVal(filter: any) {
		if (typeof filter !== "object") {
			throw new Error("Filter not an object");
		}

		let filterKeys = Object.keys(filter);
		switch (filterKeys.length) {
			case 0:
				return [null, null];
			case 1:
				return [filterKeys[0], filter[filterKeys[0]]];
			default:
				throw new Error("Filter has more than one key");
		}
	}

	private parseFilter(key: any, value: any) {
		switch (key) {
			case "AND":
			case "OR":
				// logic comparison
				return this.parseLogicComparison(key, value);
			case "GT":
			case "LT":
			case "EQ":
				// m comparison
				return this.parseMComparison(key, value);
			case "IS":
				// s comparison
				return this.parseSComparison(key, value);
			case "NOT":
				// negation
				return this.parseNegation(key, value);
			default:
				throw new Error("Not a correct filter key");
		}
	}

	private parseLogicComparison(key: any, value: any) {
		this.filterListValues(value);
		return true;
	}

	private parseMComparison(key: any, value: any) {
		let [mKey, mVal] = this.filterKeyVal(value);
		if (mKey === null) {
			throw new Error("Empty m comparison");
		}

		let [idString, mField] = this.parseComparatorKey(mKey, this.mKeyCorrectValues);

		if (isNaN(mVal)) {
			throw new Error("Bad value for m key");
		}
		this.setId(idString);
		return true;
	}

	private parseSComparison(key: any, value: any) {
		let [sKey, inputString] = this.filterKeyVal(value);
		if (sKey === null) {
			throw new Error("Empty s comparison");
		}
		let [idString, sField] = this.parseComparatorKey(sKey, this.sKeyCorrectValues);
		if (typeof inputString !== "string") {
			throw new Error("Bad value for input string");
		}
		if (inputString.startsWith("*")) {
			inputString = inputString.substring(1);
		}
		if (inputString.endsWith("*")) {
			inputString = inputString.substring(0, inputString.length - 1);
		}
		if (inputString.includes("*")) {
			throw new Error("Bad value for input string");
		}
		this.setId(idString);
		return true;
	}

	private parseNegation(key: any, value: any) {
		let [filterKey, filterVal] = this.filterKeyVal(value);
		this.parseFilter(filterKey, filterVal);
		return true;
	}

	private filterListValues(filterList: any) {
		if (!Array.isArray(filterList)) {
			throw new Error("Filter list is not a comma-separated list");
		}
		if (filterList.length === 0) {
			throw new Error("Filter list is empty");
		}

		return filterList.map((filter) => {
			let [filterKey, filterValue] = this.filterKeyVal(filter);
			return this.parseFilter(filterKey, filterValue);
		});
	}

	private parseComparatorKey(key: any, correctFields: any) {
		if(!key.includes("_")) {
			throw new Error("Invalid key: does not include underscore");
		}

		let parts = key.split("_");
		if(parts.length !== 2) {
			throw new Error("Invalid key: more or less than 2 parts");
		}

		let idString = parts[0].trim();
		if (idString.length === 0) {
			throw new Error("Invalid key: empty key");
		}
		// shouldn't get here but just in case
		if (idString.includes("_")) {
			throw new Error("Invalid key: underscore weirdness");
		}

		let field = parts[1].trim();
		if (!correctFields.includes(field)) {
			console.log(field);
			throw new Error("Invalid key: not a correct field");
		}

		return [idString, field];
	}

	private parseOptions(options: any) {
		// can contain ORDER, HAS to contain COLUMNS
		if (typeof options !== "object") {
			throw new Error("Options not an object");
		}
		if (!("COLUMNS" in options)) {
			throw new Error("Options missing columns");
		}
		let columns = options["COLUMNS"];
		let orderKeys = null;
		if ("ORDER" in options) {
			orderKeys = options["ORDER"];
		}
		if (Object.keys(options).length > 2) {
			throw new Error("Options has more than 2 keys");
		}

		let columnKeys = this.columnKeyVal(columns);
		if (orderKeys !== null) {
			if (!columnKeys.includes(orderKeys)) {
				throw new Error("Order key not in column keys");
			}
		}
		return true;
	}

	private columnKeyVal(columns: any) {
		if (!Array.isArray(columns)) {
			throw new Error("Columns not an array");
		}

		if (columns.length === 0) {
			throw new Error("Columns empty");
		}

		return columns.map((key) => {
			try {
				this.parseComparatorKey(key, this.mKeyCorrectValues);
			} catch (err) {
				this.parseComparatorKey(key, this.sKeyCorrectValues);
			}
			return key;
		});
	}

	public isValid(query: any): boolean { // returns an array [if query is valid, id String]
		if (typeof query !== "object") {
			return false;
		}

		if (!this.isQueryKeysValid(query)) {
			return false;
		}

		try {
			let [filterKey, filterValue] = this.filterKeyVal(query["WHERE"]);
			return this.parseFilter(filterKey, filterValue) && this.parseOptions(query["OPTIONS"]);
		} catch (e) {
			console.error(e);
			return false;
		}
	}
}
