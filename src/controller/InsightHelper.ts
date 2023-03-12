import {InsightDatasetExpanded, RoomFacade, SectionFacade} from "./DatasetFacade";
import {InsightDatasetKind} from "./IInsightFacade";
import {parse} from "parse5";
import {Node, Element} from "parse5/dist/tree-adapters/default";

export default abstract class InsightHelper {
	private static findTables(childNodes: Node[], tableNodes: Element[]) {
		if (childNodes) {
			for (let node of childNodes) {
				let nodeElement = node as Element;
				if (nodeElement) {
					if (nodeElement.tagName === "table") {
						tableNodes.push(nodeElement);
					} else {
						this.findTables(nodeElement.childNodes, tableNodes);
					}
				}
			}
		}
	}

	public static fileStringToTableArray(fileString: string) {
		let fileJSON = parse(fileString);
		let tableNodes: Element[] = [];
		this.findTables(fileJSON.childNodes, tableNodes);
		return tableNodes;
	}

	public static tableArrayToCodes(tables: Element[]) {
		let result = [];
		for (let table of tables) {
			for (let tableNode of table.childNodes) {
				let tableElement = tableNode as Element;
				if (tableElement.tagName === "tbody") {
					let codes = tableElement.childNodes.filter((node) => {
						let bodyElement = node as Element;
						return bodyElement.tagName === "tr";
					}).map((node) => {
						let bodyElement = node as Element;
						return bodyElement.childNodes.filter((childNode) => {
							let childElement = childNode as Element;
							return (childElement.tagName === "td") &&
								(childElement.attrs[0].value === "views-field views-field-field-building-code");
						}).flatMap((childNode) => {
							let childElement = childNode as Element;
							if ("value" in childElement.childNodes[0]) {
								return childElement.childNodes[0].value.trim();
							}
							return [];
						});
					}).flat();

					result.push(codes);
				}
			}
		}
		result = result.flat();
		return result;
	}

	public static fileStringToRoomArray(fileString: string) {
		if (fileString.trim().length === 0) {
			return [];
		}

		let tables = InsightHelper.fileStringToTableArray(fileString);

		let rooms: RoomFacade[] = [];

		return rooms;
	}

	public static fileStringToSectionArray(fileString: string) {
		if (fileString.trim().length === 0) {
			return [];
		}
		let sections = [];
		let jsonified = JSON.parse(fileString);
		for (let section of jsonified.result) {
			// todo check if any of these are undefined
			let newSection: SectionFacade = {
				audit: section.Audit,
				avg: section.Avg,
				dept: section.Subject,
				fail: section.Fail,
				id: section.Course,
				instructor: section.Professor,
				pass: section.Pass,
				title: section.Title,
				uuid: section.id,
				year: section.Year
			};

			if (section.Section === "overall") {
				newSection.year = 1900;
			}

			sections.push(newSection);
			// todo file persistence
			// fs.outputJson("/data/" + id + "/" + section.id + ".json", newSection)
			//	.catch((err) => {
			//		console.error(err);
			//	 });
		}
		return sections;
	}

	public static sectionArraysToDataset(sectionArrays: SectionFacade[][], id: string, kind: InsightDatasetKind) {
		let sections = sectionArrays.flat();

		let newDataset: InsightDatasetExpanded = {
			id: id,
			kind: kind,
			numRows: sections.length,
			sections: sections,
			rooms: []
		};

		return newDataset;
	}
}
