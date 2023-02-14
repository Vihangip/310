import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult, NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import IsQueryValid from "./isQueryValid";

import {folderTest} from "@ubccpsc310/folder-test";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";


use(chaiAsPromised);

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let badCoursesFolderSections: string; // JSON files are not in a courses folder

	before(function () {
		// This block runs once and loads the datasets.
		sections = getContentFromArchives("pair.zip");
		badCoursesFolderSections = getContentFromArchives("badCoursesFolderPair.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		clearDisk();
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			facade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			clearDisk();
		});

		// This is a unit test. You should create more like this!
		it ("should reject with an empty dataset id", function() {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		// NEW TESTS ADDED BELOW:
		it ("should successfully add a dataset", function() {
			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["ubc"]);
		});

		it ("should reject with dataset id with underscore (causes problems with ebnf?)", function() {
			const result = facade.addDataset("ubc_courses", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject with a space dataset id", function() {
			const result = facade.addDataset(" ", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject with a tab dataset id", function() {
			const result = facade.addDataset("	", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject with a duplicate dataset id", function() {
			facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject with a nonexistent dataset (no zip file)", function() {
			const result = facade.addDataset("ubc", "", InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject with an invalid course (not in courses/)", function() {
			const result = facade.addDataset("ubc", badCoursesFolderSections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should successfully remove a dataset", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const result = facade.removeDataset("ubc");
			return expect(result).to.eventually.equal("ubc");
		});

		it ("should reject with an empty dataset id", function() {
			const result = facade.removeDataset("");
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it ("should reject because the course wasn't previously added", function() {
			const result = facade.removeDataset("ubc");
			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});

		it ("should successfully list all datasets including new one", async function() {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const result = facade.listDatasets();
			return expect(result).to.eventually.have.members(["ubc"]);
		});

		it ("should successfully report one dataset added", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const result = facade.listDatasets();
			return expect(result).to.eventually.have.length(1);
		});

		it ("should successfully report no datasets added yet", function() {
			const result = facade.listDatasets();
			return expect(result).to.eventually.have.length(0);
		});
	});

	describe("ValidateQuery", function () {

		it("should successfully validate simple query with MCOMP", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				GT: {
					sections_avg: 97
				}
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}});
			return expect(result).to.be.true;

		});

		it("should successfully validate simple query with SCOMP", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				IS: {
					sections_id: "1234"
				}
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}});
			return expect(result).to.be.true;

		});

		it("should successfully validate simple query with Logic", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				AND: [
					{GT: {
						sections_avg: 97
					}}
					, {IS: {
						sections_id: "1234"

					}}
				]
			}
			,
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}});
			return expect(result).to.be.true;

		});

		it("should successfully validate simple query with Negation", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				NOT: {GT: {
					sections_avg: 97
				}}

			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}});
			return expect(result).to.be.true;

		});

		it("should successfully validate complex query", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				OR: [
					{
						AND: [
							{
								GT: {
									sections_avg: 90
								}
							},
							{
								IS: {
									sections_dept: "adhe"
								}
							}
						]
					},
					{
						EQ: {
							sections_avg: 95
						}
					}
				]
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_id",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}});
			return expect(result).to.be.true;

		});

		it("should reject due to extra field", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {}, OPTIONS: {}, OTHER: {}});
			return expect(result).to.be.false;
		});

		it("should reject due to invalid structure", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({OPTIONS: {}});
			return expect(result).to.be.false;
		});

		it("should reject due to invalid filter", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				PST: {
					sections_avg: 97
				}
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}});
			return expect(result).to.be.false;

		});

		it("should reject due to invalid idString", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				GT: {
					sec_tions_avg: 97
				}
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}});
			return expect(result).to.be.false;

		});

		it("should reject due to invalid input string", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				IS: {
					sections_id: "12*34"
				}
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}});
			return expect(result).to.be.false;

		});

		it("should reject due to invalid mfield", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				GT: {
					sections_average: 97
				}
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}});
			return expect(result).to.be.false;

		});

		it("should reject due to invalid sfield", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				ISEQUAl: {
					sections_id: "1234"
				}
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}});
			return expect(result).to.be.false;

		});

		it("should reject due to invalid columns", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				GT: {
					sections_average: 97
				}
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"1"
				],
				ORDER: "sections_avg"
			}});
			return expect(result).to.be.false;

		});

		it("should reject due to invalid order", function () {
			const validator = new IsQueryValid();
			const result = validator.isValid({WHERE: {
				GT: {
					sections_average: 97
				}
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "97"
			}});
			return expect(result).to.be.false;

		});


	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			facade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			clearDisk();
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => facade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnResult: (actual, expected) => {
					// TODO add an assertion!
				},
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: (actual, expected) => {
					// TODO add an assertion!
				},
			}
		);
	});
});
