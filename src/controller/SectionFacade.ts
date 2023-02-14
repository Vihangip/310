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

// interface that represents a dataset. contains base level info as well as a list of sections
// with detailed info about each. an InsightDatasetExpanded[] member variable should exist
// in InsightFacade
export interface InsightDatasetExpanded extends InsightDataset {
	sections: SectionFacade[];
}
