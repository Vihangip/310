function parseFormData(formData) {
	const stringFields = ["uuid", "id", "title", "instructor", "dept"]
	const numberFields = ["year", "avg", "pass", "fail", "audit"];
	const datasetName = "sections";
	let basicQuery =
		{
			"WHERE": {},
			"OPTIONS": {
				"COLUMNS": []
			}
		};
	let conditions = [];
	let columns = [];

	for (let f of stringFields) {
		if (formData.get(f) != "") {
			let basicIS = {"IS": {}};
			basicIS.IS[(datasetName + "_" + f)] = formData.get(f);
			conditions.push(basicIS);
		}
		columns.push(datasetName + "_" + f);
	}
	for (let f of numberFields) {
		if (formData.get(f) != "") {
			let basicMComp = {};
			let thing = {[(datasetName + "_" + f)]: parseInt(formData.get(f))};
			console.log(thing);
			basicMComp[formData.get(f + "-comparison")] = thing;
			conditions.push(basicMComp);
		}
		columns.push(datasetName + "_" + f);
	}
	if (conditions.length > 1) {
		basicQuery.WHERE = {
			"AND": conditions
		};
	} else if (conditions.length === 1) {
		basicQuery.WHERE = conditions[0];
	}
	basicQuery.OPTIONS.COLUMNS = columns; // todo actually be able to select
	return basicQuery;
}


function handleHttpRequest1() {
	// this is where you deal with the response from the server, e.g. displaying results
	// todo: display results
	console.log("handleHttpRequest1 called");
	if (httpRequest1.readyState === XMLHttpRequest.DONE) {
		if (httpRequest1.status === 200) {
			// No problem with request, display here
			const response = JSON.parse(httpRequest1.responseText);
			let result = response.result;
			if (result.length === 0) {
				let error = "No such values exist. Please double check your input and try again. ";
				document.getElementById('results').innerHTML = error;
			} else {
				let table = '<table><tr><th>Section ID</th><th>Course ID</th><th>Title</th><th>Instructor</th><th>Department</th><th>Year</th><th>Average</th><th>Pass</th><th>Fail</th><th>Audit</th></tr>';
				for (let i = 0; i < result.length; i++) {
					let course = result[i];
					let uuid = course.sections_uuid;
					let id = course.sections_id;
					let title = course.sections_title;
					let instructor = course.sections_instructor;
					let dept = course.sections_dept;
					let year = course.sections_year;
					let avg = course.sections_avg;
					let pass = course.sections_pass;
					let fail = course.sections_fail;
					let audit = course.sections_audit;
					table += '<tr><td>' + uuid + '</td><td>' + id + '</td><td>' + title + '</td><td>' + instructor + '</td><td>' + dept + '</td><td>' + year + '</td><td>' + avg + '</td><td>' + pass + '</td><td>' + fail + '</td><td>' + audit + '</td></tr>';
				}

				table += '</table>';
				document.getElementById('results').innerHTML = table;
			}



		} else {
			let error = "Error in obtaining query results";
			document.getElementById('results').innerHTML = error;
		}
	} else {
		// Not ready yet.
	}
}

function handleHttpRequest2() {
	// this is where you deal with the response from the server, e.g. displaying results
	// todo: display results
	console.log("handleHttpRequest2 called");
	if (httpRequest2.readyState === XMLHttpRequest.DONE) {
		if (httpRequest2.status === 200) {
			// No problem with request, display here
			const response = JSON.parse(httpRequest2.responseText);
			document.getElementById('results').innerHTML = "user story 2 stuff";
		} else {
			// There was a problem with the request.
			// For example, the response may have a 404 (Not Found)
			// or 500 (Internal Server Error) response code.
		}
	} else {
		// Not ready yet.
	}
}

function handleQuerySubmit1(event) {
	console.log("handleHttpsubmit1 called");
	event.preventDefault();
	const formData = new FormData(event.target);
	const query = parseFormData(formData);
	console.log(query);

	// much of the AJAX code is based heavily on the provided AJAX documentation:
	// https://developer.mozilla.org/en-US/docs/Web/Guide/AJAX/Getting_Started
	httpRequest1.open("POST", "http://localhost:4321/query", true);
	httpRequest1.setRequestHeader("Content-Type","application/json");
	httpRequest1.send(JSON.stringify(query));
	httpRequest1.onreadystatechange = handleHttpRequest1;
}

function handleQuerySubmit2(event) {
	console.log("handleHttpSubmit2 called");
	event.preventDefault();
	const formData = new FormData(event.target);
	const query = parseFormData(formData);
	console.log(query);

	// much of the AJAX code is based heavily on the provided AJAX documentation:
	// https://developer.mozilla.org/en-US/docs/Web/Guide/AJAX/Getting_Started
	httpRequest2.open("POST", "http://localhost:4321/query", true);
	httpRequest2.setRequestHeader("Content-Type","application/json");
	httpRequest2.send(JSON.stringify(query));
	httpRequest2.onreadystatechange = handleHttpRequest2;
}

let httpRequest1 = new XMLHttpRequest();
// let httpRequest2 = new XMLHttpRequest();
console.log("here");
document.getElementById("query-form").addEventListener('submit', handleQuerySubmit1);
// document.getElementById("submit2").addEventListener('submit', handleQuerySubmit2);

// const form = document.getElementById("query-form");
// form.addEventListener("submit", function(event) {
// 	event.preventDefault();
// 	if (event.submitter.id === "submit1") {
// 		handleQuerySubmit1();
// 	} else if (event.submitter.id === "submit2") {
// 		handleQuerySubmit2();
// 	}
// });
