
import {InsightDataset, InsightResult} from "./IInsightFacade";
import {InsightDatasetExpanded, SectionFacade, RoomFacade} from "./DatasetFacade";
import QueryHelper from "./QueryHelper";


export default abstract class FacadeHelper {
	public static sortOptions(direction: string | null, anyKeyList: any[], results: any[]): any[] {
		let output: any;
		let order = anyKeyList[0];
		let words: string[] = order.split("_");
		let id: string = words[0];
		let field: string = words[1];
		if(direction === null) {
			output = results.sort(FacadeHelper.getSortingFunction(id, field, anyKeyList));
		} else {
			output = results.sort(FacadeHelper.getSortingFunction(id, field, anyKeyList));
		}
		if (direction === "DOWN") {
			return output.reverse();
		}
		return output;
	}

	private static getSortingFunction(id: string, field: string,  anyKeyList: any[]) {
		return (first: any, second: any) => {
			const firstFields: any = {};
			const secondFields: any = {};
			const firstKeys = Object.keys(first).filter((key) => key.startsWith(id));
			const secondKeys = Object.keys(second).filter((key) => key.startsWith(id));
			for(const key of firstKeys) {
				const columnField: string = key.split("_")[1];
				firstFields[columnField] = first[key];
			}
			for(const key of secondKeys) {
				const columnField: string = key.split("_")[1];
				secondFields[columnField] = second[key];
			}
			if(firstFields[field] > secondFields[field]) {
				return 1;
			}
			if(firstFields[field] < secondFields[field]) {
				return -1;
			}
			if(firstFields[field] === secondFields[field]) {
				return FacadeHelper.breakTie(first, second, anyKeyList);
			}
			return 0;
		};
	}

	private static breakTie(first: any, second: any, anyKeys: any[]): number {
		for( let i = 1; i < anyKeys.length; i++) {
			let order = anyKeys[i];
			let words: string[] = order.split("_");
			let id: string = words[0];
			let field: string = words[1];
			const firstFields: any = {};
			const secondFields: any = {};
			const firstKeys = Object.keys(first).filter((key) => key.startsWith(id));
			const secondKeys = Object.keys(second).filter((key) => key.startsWith(id));
			for(const key of firstKeys) {
				const columnField: string = key.split("_")[1];
				firstFields[columnField] = first[key];
			}
			for(const key of secondKeys) {
				const columnField: string = key.split("_")[1];
				secondFields[columnField] = second[key];
			}
			if(firstFields[field] > secondFields[field]) {
				return 1;
			}
			if(firstFields[field] < secondFields[field]) {
				return -1;
			}
		}
		return 0;
	}

	public static convertSectIndices(dataset: InsightDatasetExpanded, index: number, columns: string[]): InsightResult {
		let section = dataset.sections[index];
		let sectionInfo: InsightResult = {};
		for (let column of columns) {
			let key = dataset.id + "_" + column;
			let val = QueryHelper.getSectionInfo(section, column);
			if(val !== null) {
				sectionInfo[key] = val;
			}
		}
		return sectionInfo;
	}

	public static convertRoomIndices(dataset: InsightDatasetExpanded, index: number, columns: string[]): InsightResult {
		let room = dataset.rooms[index];
		let roomInfo: InsightResult = {};
		for (let column of columns) {
			let key = dataset.id + "_" + column;
			let val = QueryHelper.getRoomInfo(room, column);
			if(val !== null) {
				roomInfo[key] = val;
			}
		}
		return roomInfo;
	}

	public static groupResults(groupKeys: any, indices: number[], dataset: InsightDatasetExpanded): any[] {
		let groups: [];
		let facadeObjects: any;

		try {
			facadeObjects = indices.map((index) => {
				let facade;
				facade = dataset.sections[index];
				return facade;
			});
			groups = this.groupingSections(groupKeys, facadeObjects);
		} catch (e) {
			facadeObjects = indices.map((index) => {
				let facade;
				facade = dataset.rooms[index];
				return facade;
			});
			groups = this.groupingRooms(groupKeys,facadeObjects);
		}
		return groups;
	}

	private static groupingSections(groupKeys: any, facadeObjects: SectionFacade[]) {
		let groups: any = [];
		let currGroup: any = [];
		let groupValues: Map<any, any> = new Map();
		for (const groupKey of groupKeys) {
			groupValues.set(groupKey, null);
		}
		facadeObjects.sort((a, b) => {
			for (const groupKey of groupKeys) {
				const aValue = QueryHelper.getSectionInfo(a, groupKey);
				const bValue = QueryHelper.getSectionInfo(b, groupKey);
				const result = this.sortFacadeObjects(aValue, bValue);
				if (result !== 0) {
					return result;
				}
			}
			return 0;
		});
		for (const facade of facadeObjects) {
			let shouldCreateNewGroup = false;
			for (const groupKey of groupKeys) {
				let currValue = QueryHelper.getSectionInfo(facade, groupKey);
				let groupValue = groupValues.get(groupKey);
				if (groupValue !== currValue) {
					shouldCreateNewGroup = true;
					break;
				}
			}
			if (shouldCreateNewGroup) {
				if (currGroup.length !== 0) {
					groups.push(currGroup.slice());
				}
				currGroup.length = 0;
				for (const groupKey of groupKeys) {
					let currValue = QueryHelper.getSectionInfo(facade, groupKey);
					groupValues.set(groupKey, currValue);
				}
			}
			currGroup.push(facade);
		}
		groups.push(currGroup.slice());
		return groups;
	}

	private static sortFacadeObjects(first: any, second: any): number {
		if (typeof first === "number" && typeof second === "number") {
			if (first < second) {
				return -1;
			} else if (first > second) {
				return 1;
			}
		} else {
			const stringA = String(first).toLowerCase();
			const stringB = String(second).toLowerCase();
			if (stringA < stringB) {
				return -1;
			} else if (stringA > stringB) {
				return 1;
			}
		}
		return 0;
	}

	private static groupingRooms(groupKeys: any, facadeObjects: RoomFacade[]) {
		let groups: any = [];
		let currGroup: any = [];
		let groupValues: Map<any, any> = new Map();
		for (const groupKey of groupKeys) {
			groupValues.set(groupKey, null);
		}
		for (const facade of facadeObjects) {
			let shouldCreateNewGroup = false;
			for (const groupKey of groupKeys) {
				let currValue = QueryHelper.getRoomInfo(facade, groupKey);
				let groupValue = groupValues.get(groupKey);
				// TODO sometimes adds duplicate values, need to fix
				if (groupValue !== currValue) {
					shouldCreateNewGroup = true;
					break;
				}
			}
			if (shouldCreateNewGroup) {
				if (currGroup.length !== 0) {
					groups.push(currGroup.slice());
				}
				currGroup.length = 0;
				for (const groupKey of groupKeys) {
					let currValue = QueryHelper.getRoomInfo(facade, groupKey);
					groupValues.set(groupKey, currValue);
				}
			}
			currGroup.push(facade);
		}
		groups.push(currGroup.slice());
		return groups;
	}

	public static getResults(idString: string, columns: string[], applyKeys: any, transformedResults: any,
							 groupedResults: any) {
		let output: InsightResult[] = [];
		let iResult: InsightResult = {};
		for (let i = 0; i < applyKeys.length; i++) {
			for (let j = 0; j < groupedResults.length; j++) {
				let group = groupedResults[j];
				let facade = group[0];
				for (let column of columns) {
					if (column !== "applyKey") {
						let currColValue;
						try {
							currColValue = QueryHelper.getSectionInfo(facade, column);
						} catch (e) {
							currColValue = QueryHelper.getRoomInfo(facade, column);
						}
						iResult[idString + "_" + column] = currColValue;

					} else if (column === "applyKey") {
						let applyKey = applyKeys[i];
						let applyKeyValue = transformedResults[i][j];
						iResult[applyKey] = applyKeyValue;
					}
				}
				output.push(iResult);
				iResult = {};
			}
		}
		return output;
	}
}
