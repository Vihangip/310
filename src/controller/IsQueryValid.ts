
export default class IsQueryValid {

	private ids: Set<string>; // set, in case you can't have more than one idstring, etc
	constructor() {
		console.log("Checking if query is valid");
		this.ids = new Set<string>();
	}

	public getIds() {
		return this.ids;
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

		let [idString, mField] = this.parseComparatorKey(mKey, ["avg", "pass", "fail", "audit", "year"]);

		if (isNaN(mVal)) {
			throw new Error("Bad value for m key");
		}
		this.ids.add(idString);
		return true;
	}

	private parseSComparison(key: any, value: any) {
		let [sKey, inputString] = this.filterKeyVal(value);
		if (sKey === null) {
			throw new Error("Empty s comparison");
		}
		let [idString, sField] = this.parseComparatorKey(sKey, ["dept", "id", "instructor", "title", "uuid"]);
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
		this.ids.add(idString);
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
			throw new Error("Invalid key");
		}

		let parts = key.split("_");
		if(parts.length !== 2) {
			throw new Error("Invalid key");
		}

		let idString = parts[0].trim();
		if (idString.length === 0) {
			throw new Error("Invalid key");
		}
		// shouldn't get here but just in case
		if (idString.includes("_")) {
			throw new Error("Invalid key");
		}

		let field = parts[0].trim();
		if (!correctFields.includes(field)) {
			throw new Error("Invalid key");
		}

		return [idString, field];
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
			return this.parseFilter(filterKey, filterValue);
		} catch (e) {
			return false;
		}

		// todo: validate options

		/*
		if(Object.keys(query["WHERE"]).length === 0){
			let queryElement: any = query["OPTIONS"];
			let keys: any = Object.keys(queryElement);
			if(keys[0] === "COLUMNS") {
				let columns: any = queryElement["COLUMNS"];
				if(Array.isArray(columns) && columns.length >= 1) {
					for(let key of columns) {
						let stringField: string[] = key.split("_");
						this.id = stringField[0];
					}
				} else {
					return [false,this.id];
				}
			} else {
				return [false,this.id];
			}
			return [true,this.id];
		}


		if ("OPTIONS" in query) { // if body had OPTIONS and WHERE
			if(this.checkValidFilter(query["WHERE"])){
				if(this.checkValidOptions(query["OPTIONS"])){
					return [true,this.id];
				} else {
					return [false,0];
				}
			} else {
				return [false,0];
			}
		}
		return [false,0];
		*/
	}
}
