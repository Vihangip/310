// collection of small utility methods for QueryBuilder and FilterFacade
import {SectionFacade} from "./DatasetFacade";

export default abstract class QueryHelper {

	private static mKeyCorrectValues: string[] = ["avg", "pass", "fail", "audit", "year", "lat" , "lon" , "seats"];

	private static sKeyCorrectValues: string[] = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname",
		"number", "name", "address", "type", "furniture", "href"];

	// picks particular member variable from a section given a string of that member variable

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

	// ensures that WHERE, OPTIONS and TRANSFORMATIONS are the only top-level keys in a query
	public static isQueryKeysValid(query: any) {
		let correctKeys2 = ["WHERE", "OPTIONS"];
		let correctKeys3 = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];
		let queryKeys = Object.keys(query);

		if(queryKeys.length === 2) {
			for (let correctKey of correctKeys2) {
				if (!queryKeys.includes(correctKey)) {
					return false;
				}
			}
			return true;
		}

		if(queryKeys.length === 3) {
			for (let correctKey of correctKeys3) {
				if (!queryKeys.includes(correctKey)) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	/*
	returns [null, null] for an empty key-value pair, [key, value] for a single key-value pair,
	and throws for any more keys and values in an object
	*/
	public static returnKeyValPair(filter: any) {
		if (typeof filter !== "object") {
			throw new Error("Not an object");
		}
		let filterKeys = Object.keys(filter);
		switch (filterKeys.length) {
			case 0:
				return [null, null];
			case 1:
				return [filterKeys[0], filter[filterKeys[0]]];
			default:
				throw new Error("More than one key");
		}
	}

	// validates an m or s comparator key against a given list of correct fields, then splits it up
	public static isKeyValid(key: any, correctFields: any) {
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
			throw new Error("Invalid key: not a correct field");
		}
		// this.setId(idString);
		return [idString, field];
	}

	public static parseTransformations(transformations: any): any[] {
		if (typeof transformations !== "object") {
			throw new Error("Transformations is not an object");
		}

		if (!("GROUP" in transformations)) {
			throw new Error("Group missing in Transformations");
		}

		if (!("APPLY" in transformations)) {
			throw new Error("Apply missing in Transformations");
		}

		if (Object.keys(transformations).length > 2) {
			throw new Error("Transformations has more than 2 keys");
		}

		let group = transformations["GROUP"];
		let apply = transformations["APPLY"];

		let [idString, groupKeys] = this.parseGroupKeys(group);
		let [applyID, applyKeys, applyTokens, keyFields] = this.parseApplyRuleList(apply);

		let applyIdString = applyID[0];


		if (idString !== applyIdString) {
			throw new Error("Group dataset and Apply dataset are not same");
		}

		console.log("parsed transformations");
		return [groupKeys, applyKeys, applyTokens, keyFields];
	}

	private static parseGroupKeys(keys: any): any[] {
		if (!Array.isArray(keys)) {
			throw new Error("Group is not an array");
		}

		if (keys.length === 0) {
			throw new Error("Group is empty");
		}

		let idString = null;
		let fields = keys.map((key) => {
			let field = null;
			try {
				[idString, field] = this.isKeyValid(key, this.mKeyCorrectValues);
			} catch (err) {
				[idString, field] = this.isKeyValid(key, this.sKeyCorrectValues);
			}
			return field;
		});
		return [idString, fields];
	}

	// returns an array of [[idString], [apply keys], [apply tokens], [key fields]]
	// eg: [[sections], [overallAvg, maximumSeats], [AVG, MAX], [avg, seats]]
	private static parseApplyRuleList(apply: any) {
		let applyRuleList: any = [];
		let keyIdStringArr: any = [];
		let applyKeys: any = [];
		let applyTokens: any = [];
		let keyFields: any = [];
		let idString: string = "";
		if (!Array.isArray(apply)) {
			throw new Error("Apply is not an array");
		}

		let applyRules: number = apply.length;

		if (applyRules === 0) {
			throw new Error("Apply is empty");
		}

		for (let i = 0; i < applyRules; i++ ) {
			let [applyKey, applyToken, keyIdString, keyField] = this.parseApplyRule(apply[i]);
			if(idString === "") {
				idString = keyIdString;
				keyIdStringArr.push(keyIdString);
			} else if(idString !== keyIdString) {
				throw new Error("Keys are not referring to same dataset");
			}
			applyKeys.push(applyKey);
			applyTokens.push(applyToken);
			keyFields.push(keyField);
		}

		applyRuleList.push(keyIdStringArr);
		applyRuleList.push(applyKeys);
		applyRuleList.push(applyTokens);
		applyRuleList.push(keyFields);

		return applyRuleList;
	}

	// returns apply rule = [applyKey, applyToken, keyIdString, keyField]
	private static parseApplyRule(applyElement: any) {
		let correctTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
		if (typeof applyElement !== "object") {
			throw new Error("Apply rule is not an object");
		}

		let [applyKey, value] = this.returnKeyValPair(applyElement);

		if (applyKey.includes("_") || applyKey.length === 0) {
			throw new Error("Invalid Apply Key");
		}

		if (typeof value !== "object") {
			throw new Error("Apply Key value is not an object");
		}

		let [token, key] = this.returnKeyValPair(value);

		if (!correctTokens.includes(token)) {
			throw new Error("Incorrect Token");
		}

		let field;
		let idString;
		try {
			[idString, field] = QueryHelper.isKeyValid(key, this.mKeyCorrectValues);
		} catch (err) {
			[idString, field] = QueryHelper.isKeyValid(key, this.sKeyCorrectValues);
		}

		return [applyKey, token, idString, field];
	}
}
