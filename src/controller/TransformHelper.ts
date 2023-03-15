import QueryHelper from "./QueryHelper";

export default abstract class TransformHelper {
	public static applyTransformations(groupedResults: any[], applyTokens: any,
									   keyFields: any): any[] {
		let output: any = [];
		let values: any = [];
		let tokenValues: any;
		for (let i = 0; i < applyTokens.length; i++) {
			for (let group of groupedResults) {
				let currValues: any = [];
				for (let facade of group) {
					let key = keyFields[i];
					let value;
					try {
						value = QueryHelper.getSectionInfo(facade, key);
					} catch (e) {
						value = QueryHelper.getRoomInfo(facade, key);
					}
					currValues.push(value);
				}
				values.push(currValues.slice());
			}
			let currToken = applyTokens[i];

			switch (currToken) {
				case "MIN" :
					tokenValues = this.performMin(values);
					break;
				case "MAX":
					tokenValues = this.performMax(values);
					break;
				case "SUM":
					tokenValues = this.performSum(values);
					break;
				case "COUNT":
					tokenValues = this.performCount(values);
					break;
				case "AVG":
					tokenValues = this.performAvg(values);
					break;
				default:
			}
			output.push(tokenValues);
		}
		return output;
	}

	private static performMin(values: any): number[] {
		let minArray: any = [];
		let smallest: any = null;
		for (let groupValues of values) {
			for (let value of groupValues) {
				if (typeof value !== "number") {
					throw new Error("Min value is not a number");
				}
				if (smallest === null || value < smallest) {
					smallest = value;
				}
			}
			minArray.push(smallest);
		}
		return minArray;
	}

	private static performMax(values: any): number[] {
		let maxArray: any = [];
		let largest: any = null;
		for (let groupValues of values) {
			for (let value of groupValues) {
				if (typeof value !== "number") {
					throw new Error("Max value is not a number");
				}
				if (largest === null || value > largest) {
					largest = value;
				}
			}
			maxArray.push(largest);
		}
		return maxArray;
	}

	private static performSum(values: any): number[] {
		let sumArray: any = [];
		let sum: number = 0;
		for (let groupValues of values) {
			for (let value of groupValues) {
				if (typeof value !== "number") {
					throw new Error("Sum value is not a number");
				}
				sum = sum + value;
			}
			sumArray.push(this.formatNumber(sum));
			sum = 0;
		}
		return sumArray;
	}

	private static performCount(values: any): number[] {
		let countArray: any = [];
		let count: number = 0;
		for (let groupValues of values) {
			for (let value of groupValues) {
				count = count++;
			}
			countArray.push(count);
		}
		return countArray;
	}

	private static performAvg(values: any): number[] {
		let avgArray: any = [];
		let sum: number = 0;
		let count: number = 0;
		let avg: any;
		for (let groupValues of values) {
			for (let value of groupValues) {
				if (typeof value !== "number") {
					throw new Error("Avg value is not a number");
				}
				sum = sum + value;
				count++;
			}
			avg = sum / count;
			sum = 0;
			count = 0;
			avgArray.push(this.formatNumber(avg));
		}
		return avgArray;
	}

	private static formatNumber(number: number): number {
		let correctNumber: string;
		const roundedNum = number.toFixed(2);
		const parts = roundedNum.split(".");
		if (parts[1] === "00") {
			correctNumber =  parts[0];
		} else if (parts[1].endsWith("0")) {
			correctNumber = parts[0] + "." + parts[1][0];
		} else {
			correctNumber = roundedNum;
		}
		return Number(correctNumber);
	}

}
