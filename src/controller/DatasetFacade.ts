import {InsightDataset} from "./IInsightFacade";

// interface that represents a single section
export interface SectionFacade {
	uuid: string;
	id: string;
	title: string;
	instructor: string;
	dept: string;
	year: number;
	avg: number;
	pass: number;
	fail: number;
	audit: number;
}

// interface that represents a single room
export interface RoomFacade {
	fullname: string;
	shortname: string;
	number: string;
	name: string;
	address: string;
	lat: number;
	lon: number;
	seats: number;
	type: string;
	furniture: string;
	href: string;
}

// interface that represents a single building
export interface BuildingFacade {
	fullname: string;
	shortname: string;
	address: string;
	lat: number;
	lon: number;
}

// interface that represents a dataset. contains base level info as well as a list of sections
// or rooms with detailed info about each. an InsightDatasetExpanded[] member variable should exist
// in InsightFacade
export interface InsightDatasetExpanded extends InsightDataset {
	sections: SectionFacade[];
	rooms: RoomFacade[];
}
