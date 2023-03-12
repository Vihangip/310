import {InsightDatasetExpanded, RoomFacade, SectionFacade} from "./DatasetFacade";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {parse} from "parse5";
import {Node, Element} from "parse5/dist/tree-adapters/default";
import JSZip, {JSZipObject} from "jszip";

export default abstract class InsightHelper {
	private static readonly validIndexClasses = ["views-field-title", "views-field-field-building-code",
		"views-field-field-building-address", "views-field-field-building-image", "views-field-nothing"];

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

	public static findValidTable(tables: Element[]) {
		for (let table of tables) {
			if (table.childNodes) {
				for (let tableNode of table.childNodes) {
					let tableElement = tableNode as Element;
					if (tableElement.childNodes) {
						for (let rowNode of tableElement.childNodes) {
							let rowElement = rowNode as Element;
							if (rowElement.childNodes) {
								for (let cellNode of rowElement.childNodes) {
									let cellElement = cellNode as Element;
									if ((cellElement.tagName === "td") &&
										(cellElement.attrs[0].value.includes("views-field")) &&
										this.classContainsOneOf(cellElement.attrs[0].value, this.validIndexClasses)) {
										return table;
									}
								}
							}
						}
					}
				}
			}
		}
	}

	public static getGoodCells(table: Element) {
		let body = table.childNodes.filter((childNode) => {
			let childElement = childNode as Element;
			return childElement.tagName === "tbody";
		})[0] as Element;

		let cells = body.childNodes.filter((childNode) => {
			let childElement = childNode as Element;
			return childElement.tagName === "tr";
		}).map((node) => {
			let element = node as Element;
			return element.childNodes;
		}).flat();

		let goodCells = cells.filter((childNode) => {
			let childElement = childNode as Element;
			return (childElement.tagName === "td") &&
				(childElement.attrs[0].value === "views-field views-field-field-building-code");
		});

		return goodCells.flatMap((childNode) => {
			let childElement = childNode as Element;
			if ("value" in childElement.childNodes[0]) {
				return childElement.childNodes[0].value.trim();
			}
			return [];
		});
	}

	private static classContainsOneOf(classString: string, options: string[]) {
		for (let option of options) {
			if (classString.includes(option)) {
				return true;
			}
		}
		return false;
	}

	public static getFilteredRoomFiles(fileString: string, z: JSZip) {
		let indexTables = InsightHelper.fileStringToTableArray(fileString);
		let validIndexTable = InsightHelper.findValidTable(indexTables);
		if (!validIndexTable) {
			throw new InsightError("Invalid content: no valid table in index.htm");
		}
		let indexTableCodes = InsightHelper.getGoodCells(validIndexTable);
		let filteredFiles: JSZipObject[] = [];
		for (let code of indexTableCodes) {
			let filePath = "campus/discover/buildings-and-classrooms/" + code + ".htm";
			if (z.file(filePath)) {
				filteredFiles.push(z.file(filePath) as JSZipObject);
			}
		}
		if (filteredFiles.length === 0) {
			throw new InsightError("Invalid content: not within a campus/discover folder");
		}
		return filteredFiles;
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
