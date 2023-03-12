import {BuildingFacade, InsightDatasetExpanded, RoomFacade, SectionFacade} from "./DatasetFacade";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import {parse} from "parse5";
import {Node, Element} from "parse5/dist/tree-adapters/default";
import JSZip, {JSZipObject} from "jszip";
import InsightFacade from "./InsightFacade";
import RoomHelper from "./RoomHelper";

export default abstract class SectionHelper {
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
