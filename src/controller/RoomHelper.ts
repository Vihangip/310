import {BuildingFacade, InsightDatasetExpanded, RoomFacade, SectionFacade} from "./DatasetFacade";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {parse} from "parse5";
import {Node, Element} from "parse5/dist/tree-adapters/default";
import JSZip, {JSZipObject} from "jszip";
import GeolocationHelper from "./GeolocationHelper";

export default abstract class RoomHelper {
	private static readonly validIndexClasses = ["views-field-title", "views-field-field-building-code",
		"views-field-field-building-address", "views-field-field-building-image", "views-field-nothing"];

	public static classContainsOneOf(classString: string, options: string[]) {
		for (let option of options) {
			if (classString.includes(option)) {
				return true;
			}
		}
		return false;
	}

	public static getCellLinkTitles(validTable: Element, desiredClass: string) {
		return RoomHelper.getGoodCells(validTable, (element) => {
			return element.attrs[0].value.includes(desiredClass);
		}).flatMap((node) => {
			let element = node as Element;
			let childElement = element.childNodes[1] as Element;
			if ("value" in childElement.childNodes[0]) {
				return childElement.childNodes[0].value.trim();
			}
			return [];
		});
	}

	public static getRoomCapacities(validTable: Element) {
		return RoomHelper.getGoodCells(validTable, (element) => {
			return element.attrs[0].value.includes("views-field-field-room-capacity");
		}).flatMap((childNode) => {
			let childElement = childNode as Element;
			if ("value" in childElement.childNodes[0]) {
				return parseInt(childElement.childNodes[0].value.trim(), 10);
			}
			return [];
		});
	}

	public static getCellStrings(validTable: Element, desiredClass: string) {
		return RoomHelper.getGoodCells(validTable, (element) => {
			return element.attrs[0].value.includes(desiredClass);
		}).flatMap((childNode) => {
			let childElement = childNode as Element;
			if ("value" in childElement.childNodes[0]) {
				return childElement.childNodes[0].value.trim();
			}
			return [];
		});
	}

	public static getRoomHrefs(validTable: Element) {
		return RoomHelper.getGoodCells(validTable, (element) => {
			return element.attrs[0].value.includes("views-field-field-room-number");
		}).flatMap((node) => {
			let element = node as Element;
			let childElement = element.childNodes[1] as Element;
			return childElement.attrs[0].value.trim();
		});
	}

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

	// yes... this looks AWFUL lol. working on making it more readable
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
										RoomHelper.classContainsOneOf(cellElement.attrs[0].value,
											this.validIndexClasses)) {
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

	public static getGoodCells(table: Element, filterFn: (element: Element) => boolean) {
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
				filterFn(childElement);
		});

		return goodCells;
	}

	private static makeBuildings(codes: string[], addresses: string[], names: string[]) {
		// todo check if the arrays are diff lengths
		let buildings: BuildingFacade[] = [];
		for (let i = 0; i < codes.length; i++) {
			let newBuilding: BuildingFacade = {
				address: addresses[i], fullname: names[i], lat: 0, lon: 0, shortname: codes[i]
			};
			buildings.push(newBuilding);
		}
		return buildings;
	}

	private static getIndexRoomInfo(fileString: string, z: JSZip): [JSZipObject[], BuildingFacade[]] {
		let indexTables = RoomHelper.fileStringToTableArray(fileString);
		let validIndexTable = RoomHelper.findValidTable(indexTables);
		if (!validIndexTable) {
			throw new InsightError("Invalid content: no valid table in index.htm");
		}
		let codes = RoomHelper.getCellStrings(validIndexTable, "views-field-field-building-code");
		let addresses = RoomHelper.getCellStrings(validIndexTable, "views-field-field-building-address");
		let names = RoomHelper.getCellLinkTitles(validIndexTable, "views-field-title");
		let buildings = RoomHelper.makeBuildings(codes, addresses, names);
		let filteredFiles: JSZipObject[] = [];
		for (let code of codes) {
			let filePath = "campus/discover/buildings-and-classrooms/" + code + ".htm";
			if (z.file(filePath)) {
				filteredFiles.push(z.file(filePath) as JSZipObject);
			}
		}
		if (filteredFiles.length === 0) {
			throw new InsightError("Invalid content: not within a campus/discover folder");
		}
		return [filteredFiles, buildings];
	}

	public static getRoomPromises(fileString: string, z: JSZip) {
		let [filteredFiles, buildings] = RoomHelper.getIndexRoomInfo(fileString, z);
		let promises: Array<Promise<RoomFacade[]>> = [];
		for (let i = 0; i < filteredFiles.length; i++) {
			promises.push(
				new Promise((resolve, reject) => {
					filteredFiles[i].async("string")
						.then((str) => {
							try {
								let rooms = RoomHelper.fileStringToRoomArray(str, buildings[i]);
								resolve(rooms);
							} catch (err) {
								reject(err);
							}
						})
						.catch((err) => {
							reject(err);
						});
				}));
		}
		return promises;
	}

	public static fileStringToRoomArray(fileString: string, building: BuildingFacade) {
		if (fileString.trim().length === 0) {
			return [];
		}
		let tables = RoomHelper.fileStringToTableArray(fileString);
		let validTable = RoomHelper.findValidTable(tables);
		if (!validTable) {
			return [];
		}
		let roomNumbers = RoomHelper.getCellLinkTitles(validTable, "views-field-field-room-number");
		let roomCapacities = RoomHelper.getRoomCapacities(validTable);
		let roomFurnitures = RoomHelper.getCellStrings(validTable, "views-field-field-room-furniture");
		let roomTypes = RoomHelper.getCellStrings(validTable, "views-field-field-room-type");
		let roomHrefs = RoomHelper.getRoomHrefs(validTable);
		let rooms: RoomFacade[] = [];

		// todo check if lengths are not good
		for (let i = 0; i < roomNumbers.length; i++) {
			let newRoom: RoomFacade = {
				address: building.address,
				fullname: building.fullname,
				furniture: roomFurnitures[i],
				href: roomHrefs[i],
				lat: 0,
				lon: 0,
				name: building.shortname + "_" + roomNumbers[i],
				number: roomNumbers[i],
				seats: roomCapacities[i],
				shortname: building.shortname,
				type: roomTypes[i]
			};
			rooms.push(newRoom);
		}

		return rooms;
	}

	public static roomArraysToDataset(roomArrays: RoomFacade[][], id: string, kind: InsightDatasetKind) {
		let rooms = roomArrays.flat();
		let newDataset: InsightDatasetExpanded = {
			id: id,
			kind: kind,
			numRows: rooms.length,
			sections: [],
			rooms: rooms
		};
		return newDataset;
	}
}
