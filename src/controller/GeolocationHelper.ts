import * as http from "http";
import {InsightError} from "./IInsightFacade";
import {RoomFacade} from "./DatasetFacade";


export default abstract class GeolocationHelper {
	private static teamNumber: string = "152";
	private static urlStart: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team";
	public static async getGeolocationObj(address: string) {
		let encodedAddress = encodeURIComponent(address);
		let url = this.urlStart + this.teamNumber + "/" + encodedAddress;
		return new Promise<any> ((resolve, reject) => {
			// based on http documentation: https://nodejs.org/api/http.html#httpgeturl-options-callback
			http.get(url, (res) => {
				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});
				res.on("end", () => {
					resolve(JSON.parse(data));
				});
			}).on("error", (err) => {
				reject(err);
			});
		});
	}
}
