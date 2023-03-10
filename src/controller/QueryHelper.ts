// collection of small utility methods for QueryBuilder and FilterFacade
import {SectionFacade} from "./DatasetFacade";

export default abstract class QueryHelper {
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

	// ensures that WHERE and OPTIONS are the only top-level keys in a query
	public static isQueryKeysValid(query: any) {
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

	/*
	returns [null, null] for an empty key-value pair, [key, value] for a single key-value pair,
	and throws for any more keys and values in an object
	*/
	public static validateKeyValPair(filter: any) {
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
}
