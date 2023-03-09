import {
	Filter,
	MComparisonFilter,
	SComparisonFilter,
	Query,
	LogicComparisonFilter,
	NegationFilter, EmptyFilter
} from "./FilterFacade";
import QueryHelper from "./QueryHelper";

export default class QueryBuilder {
	private id: string;
	private readonly mKeyCorrectValues;
	private readonly sKeyCorrectValues;

	constructor() {
		console.log("Checking if query is valid");
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
		// the only valid object here is one with a single key-value pair
		let [mKey, mVal] = QueryHelper.validateKeyValPair(value);
		if (mKey === null) {
			throw new Error("Empty m comparison");
		}
		// validates and splits up the two portions of the object's key, e.g. "sections_avg" -> "sections" and "avg"
		let [idString, mField] = this.splitComparatorKey(mKey, this.mKeyCorrectValues);
		// the object's value MUST be a number
		if (typeof mVal !== "number") {
			throw new Error("Bad value for m key");
		}
		return new MComparisonFilter(key, idString, mField, mVal);
	}

	// s comparisons have a key and object
	private parseSComparison(key: any, value: any) {
		// the only valid object here is one with a single key-value pair
		let [sKey, inputString] = QueryHelper.validateKeyValPair(value);
		if (sKey === null) {
			throw new Error("Empty s comparison");
		}
		// validates and splits up the two portions of the object's key, e.g. "sections_dept" -> "sections" and "dept"
		let [idString, sField] = this.splitComparatorKey(sKey, this.sKeyCorrectValues);
		// the object's value MUST be a string
		if (typeof inputString !== "string") {
			throw new Error("Bad value for input string");
		}
		// building regex to deal with wildcards
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
		let [filterKey, filterVal] = QueryHelper.validateKeyValPair(value);
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
			let [filterKey, filterValue] = QueryHelper.validateKeyValPair(filter);
			return this.parseFilter(filterKey, filterValue);
		});
	}

	// validates an m or s comparator key against a given list of correct fields, then splits it up
	private splitComparatorKey(key: any, correctFields: any) {
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
		this.setId(idString);
		return [idString, field];
	}

	// determine whether OPTIONS is valid and deal with ORDER if necessary
	private parseOptions(options: any) {
		// can contain ORDER, HAS to contain COLUMNS
		if (typeof options !== "object") {
			throw new Error("Options not an object");
		}
		if (!("COLUMNS" in options)) {
			throw new Error("Options missing columns");
		}
		let columns = options["COLUMNS"];
		let orderKey = null;
		if ("ORDER" in options) {
			orderKey = options["ORDER"];
		}
		if (Object.keys(options).length > 2) {
			throw new Error("Options has more than 2 keys");
		}
		// get overall id (single string) and a list of the mfields/sfields of each column (list of strings)
		// (e.g. "sections_avg", "sections_id" -> ["sections", ["avg", "id"]])
		let [idString, columnFields] = this.parseColumnFields(columns);
		let orderField = null;
		if (orderKey !== null) {
			if (!columns.includes(orderKey)) {
				throw new Error("Order key not in column keys");
			}
			// grab mfield/sfield of order as well, if it exists
			let [orderIdString, orderFields] = this.parseColumnFields([orderKey]);
			if(orderFields) {
				orderField = orderFields[0];
			}
		}
		return [columnFields, orderField];
	}

	// get overall id (single string) and a list of the mfields/sfields of each key in a key list (list of strings)
	private parseColumnFields(keys: any) {
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
				[idString, field] = this.splitComparatorKey(key, this.mKeyCorrectValues);
			} catch (err) {
				[idString, field] = this.splitComparatorKey(key, this.sKeyCorrectValues);
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
		// WHERE and OPTIONS should be the only top-level keys in the query
		if (!QueryHelper.isQueryKeysValid(query)) {
			return null;
		}
		/*
		this try-catch is the root of all the error handling in this class!
		if ANYTHING goes wrong in query validation and building, this function must return null
		 */
		try {
			/*
			WHERE has a single filter object (key-value pair). if valid, this will be one of:
			[null, null] (no filter), [logic comparison, list of filters], [m comparison, object],
			[s comparison, object], [negation, single filter].
			the below function validates the filter object and splits it up
			*/
			let [filterKey, filterValue] = QueryHelper.validateKeyValPair(query["WHERE"]);
			// this info is then turned into a custom Filter object
			let filter: Filter;
			if(filterKey) {
				filter = this.parseFilter(filterKey, filterValue);
			} else {
				filter = new EmptyFilter("");
			}
			/*
			OPTIONS has a similar object, which contains COLUMNS and may contain ORDER.
			in this step we validate and split it up, similar to above
			 */
			let [columnFields, orderField] = this.parseOptions(query["OPTIONS"]);
			return new Query(filter, columnFields, orderField);
		} catch (e) {
			console.error(e);
			return null;
		}
	}
}
