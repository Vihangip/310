import Query, {
	Filter,
	MComparisonFilter,
	SComparisonFilter,
	LogicComparisonFilter,
	NegationFilter, EmptyFilter
} from "./FilterFacade";

import QueryHelper from "./QueryHelper";


export default class QueryBuilder {
	private id: string;
	private readonly mKeyCorrectValues;
	private readonly sKeyCorrectValues;

	constructor() {
		this.id = "";
		this.mKeyCorrectValues = ["avg", "pass", "fail", "audit", "year", "lat" , "lon" , "seats"];
		this.sKeyCorrectValues = ["dept", "id", "instructor", "title", "uuid", "fullname" , "shortname" , "number" ,
			"name" , "address" , "type" , "furniture" , "href"];
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

	// determines which kind of Filter object to create
	private parseFilter(key: any, value: any): Filter {
		switch (key) {
			case "AND":
			case "OR":
				return this.parseLogicComparison(key, value);
			case "GT":
			case "LT":
			case "EQ":
				return this.parseMComparison(key, value);
			case "IS":
				return this.parseSComparison(key, value);
			case "NOT":
				return this.parseNegation(key, value);
			default:
				throw new Error("Not a correct filter key");
		}
	}

	/*
	logic comparisons have a key and filter list.
	because logic comparisons can be nested, using filterListValues we recurse through the sub-filters in the
	filter list to build all sub-Filters before building this particular Filter
	 */
	private parseLogicComparison(key: any, value: any) {
		return new LogicComparisonFilter(key, this.filterListValues(value));
	}

	// m comparisons have a key and object
	private parseMComparison(key: any, value: any): MComparisonFilter {
		let [mKey, mVal] = QueryHelper.returnKeyValPair(value);
		if (mKey === null) {
			throw new Error("Empty m comparison");
		}

		let [idString, mField] = QueryHelper.isKeyValid(mKey, this.mKeyCorrectValues);
		this.setId(idString);
		if (typeof mVal !== "number") {
			throw new Error("Bad value for m key");
		}
		return new MComparisonFilter(key, idString, mField, mVal);
	}

	// s comparisons have a key and object
	private parseSComparison(key: any, value: any) {
		let [sKey, inputString] = QueryHelper.returnKeyValPair(value);
		if (sKey === null) {
			throw new Error("Empty s comparison");
		}

		let [idString, sField] = QueryHelper.isKeyValid(sKey, this.sKeyCorrectValues);
		this.setId(idString);
		if (typeof inputString !== "string") {
			throw new Error("Bad value for input string");
		}

		let start = "^";
		let end = "$";
		if (inputString.startsWith("*")) {
			inputString = inputString.substring(1);
			start = "^.*";
		}
		if (inputString.endsWith("*")) {
			inputString = inputString.substring(0, inputString.length - 1);
			end = ".*$";
		}
		if (inputString.includes("*")) {
			throw new Error("Bad value for input string");
		}
		return new SComparisonFilter(key, idString, sField, new RegExp(start + inputString + end));
	}

	// negation has a key and single filter object. because this filter can be a logic comparison, we recurse
	// through that filter and any sub-filters before making this Filter object
	private parseNegation(key: any, value: any) {
		// the only valid filter here is one with a single key-value pair
		let [filterKey, filterVal] = QueryHelper.returnKeyValPair(value);
		return new NegationFilter(key, this.parseFilter(filterKey, filterVal));
	}

	// validates the given filter list, then does parseFilter on each filter within it
	private filterListValues(filterList: any) {
		if (!Array.isArray(filterList)) {
			throw new Error("Filter list is not a comma-separated list");
		}
		if (filterList.length === 0) {
			throw new Error("Filter list is empty");
		}
		return filterList.map((filter) => {
			let [filterKey, filterValue] = QueryHelper.returnKeyValPair(filter);
			return this.parseFilter(filterKey, filterValue);
		});
	}


	// determine whether OPTIONS is valid and deal with ORDER if necessary
	private parseOptions(options: any, applyKeys: any[]) {
		if (typeof options !== "object") {
			throw new Error("Options not an object");
		}
		if (!("COLUMNS" in options)) {
			throw new Error("Options missing columns");
		}

		let columns = options["COLUMNS"];
		let orderKey = null;
		let anyKeys = null;
		let orderDirection = null;
		if ("ORDER" in options) {
			orderKey = options["ORDER"];
		}
		if (Object.keys(options).length > 2) {
			throw new Error("Options has more than 2 keys");
		}
		let [idString, columnFields] = this.parseColumnFields(columns, applyKeys);
		if (orderKey !== null) {
			let [anyKeyList, direction] = this.parseSort(orderKey, columns);
			anyKeys = anyKeyList;
			orderDirection = direction;
		}
		return [idString, columnFields, anyKeys, orderDirection];
	}

	// returns [anyKeyList, direction]
	private parseSort(sort: any, columns: any[]) {
		let anyKeyList: any = [];
		let direction: any = null;
		let correctDirections = ["UP", "DOWN"];

		// just one Anykey
		if(typeof sort !== "object") {
			if(sort === null) {
				throw new Error("Order key is empty");
			} else if (!columns.includes(sort)) {
				throw new Error("Order key is not in columns");
			}
			anyKeyList.push(sort);
		}

		// contains direction and anykey list
		if(typeof sort === "object") {
			if (Object.keys(sort).length > 2) {
				throw new Error("Order has more than 2 keys");
			}

			if (!("dir" in sort)) {
				throw new Error("dir missing in order");
			}

			if (!("keys" in sort)) {
				throw new Error("keys missing in order");
			}

			direction = sort["dir"];
			let keys: any = sort["keys"];

			if(!correctDirections.includes(direction)) {
				throw new Error("Wrong direction");
			}

			for(const key of keys) {
				if(!columns.includes(key)) {
					throw new Error("Order key is not in columns");
				}
				anyKeyList.push(key);
			}
		}
		return [anyKeyList, direction];
	}

	// get overall id (single string) and a list of anyKey
	private parseColumnFields(keys: any, applyKeys: any[]) {
		if (!Array.isArray(keys)) {
			throw new Error("Columns not an array");
		}
		if (keys.length === 0) {
			throw new Error("Columns empty");
		}
		let idString = null;
		let fields = keys.map((key) => {
			let field = null;
			try {
				[idString, field] = QueryHelper.isKeyValid(key, this.mKeyCorrectValues);
				this.setId(idString);
			} catch (err) {
				try {
					[idString, field] = QueryHelper.isKeyValid(key, this.sKeyCorrectValues);
					this.setId(idString);
				} catch (err2) {
					if (applyKeys.includes(key)) {
						field = key;
					} else {
						throw new Error("Invalid key: not an Apply Key");
					}
				}
			}
			return field;
		});

		return [idString, fields];
	}

	// validates and builds a Query object, which is composed of nested Filter objects
	public build(query: any): Query | null {
		if (typeof query !== "object") {
			return null;
		}
		if (!QueryHelper.isQueryKeysValid(query)) {
			return null;
		}

		try {
			let [filterKey, filterValue] = QueryHelper.returnKeyValPair(query["WHERE"]);
			let filter: Filter;
			if(filterKey) {
				filter = this.parseFilter(filterKey, filterValue);
			} else {
				filter = new EmptyFilter("");
			}

			let applyKeysArray = [];
			let groupKeysArray = [];
			let applyTokensArray = [];
			let keyFieldsArray = [];

			// transformations
			if(query["TRANSFORMATIONS"]) {
				let[groupKeys, applyKeys,
					applyTokens, keyFields] = QueryHelper.parseTransformations(query["TRANSFORMATIONS"]);
				applyKeysArray = applyKeys;
				groupKeysArray = groupKeys;
				applyTokensArray = applyTokens;
				keyFieldsArray = keyFields;
			}

			// options
			let [idString,columnFields, anyKeyList, direction] = this.parseOptions(query["OPTIONS"], applyKeysArray);

			if (applyKeysArray.length !== 0 && groupKeysArray.length !== 0) {
				for (let column of columnFields) {
					if (!groupKeysArray.includes(column)) {
						if (!applyKeysArray.includes(column)) {
							throw new Error("Keys in COLUMNS not in GROUP or APPLY");
						}
					}
				}
			}
			return new Query(idString, filter, columnFields, anyKeyList, direction, groupKeysArray,
				applyTokensArray, keyFieldsArray, applyKeysArray);
		} catch (e) {
			console.error(e);
			return null;
		}
	}

}
