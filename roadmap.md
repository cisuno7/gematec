me/roadmap
Endpoint: Retrieve User Roadmap
This endpoint allows users to fetch their personalized roadmap information. It is a GET request to the specified URL.
Request Parameters
No request parameters are required for this endpoint. The request is made on behalf of the authenticated user, and the necessary authentication tokens should be included in the request headers.
Expected Response
The response will contain the user's roadmap data, which typically includes:
roadmap_id: Unique identifier for the roadmap.
title: The title of the roadmap.
description: A brief description of the roadmap.
steps: An array of steps or milestones outlined in the roadmap, each containing relevant details.

Notes
Ensure that the user is authenticated before making this request.
The response will be in JSON format, and it is important to handle potential errors such as unauthorized access or server issues.

Method
GET
Endpoint
{{gematec__host}}/api/me/roadmap
Description
This endpoint is used to retrieve the roadmap associated with the authenticated user. It provides details about the user's progress, upcoming tasks, and any relevant milestones.
Request Parameters
This endpoint does not require any additional parameters in the request URL. It is designed to be called by an authenticated user, and appropriate authentication headers must be included.
Expected Response Format
The response will be returned in JSON format. It typically includes the following fields:
roadmap: An array containing detailed information about the user's roadmap items.
status: A string indicating the success or failure of the request.
message: A string providing additional information about the response.

Additional Notes
Ensure that the request includes valid authentication tokens to access user-specific data.
The response may vary based on the user's current status and the available roadmap items.
This endpoint is designed for use by authenticated users only; unauthorized requests will not return the roadmap data.



/api/roadmaps?month=8&year=2025
API Endpoint: Retrieve Roadmaps
This endpoint allows users to retrieve roadmaps based on a specified month and year. The request is made using the HTTP GET method.
Request Parameters
month (query parameter, required):
Type: integer
Description: The month for which roadmaps are being requested. This should be a value between 1 and 12.

year (query parameter, required):
Type: integer
Description: The year for which roadmaps are being requested. This should be a four-digit year.


Example Request


Plain Text








GET {{gematec__host}}/api/roadmaps?month=8&year=2025


Expected Response
The response will return a JSON object containing the following fields:
links: An object containing pagination links.
next: URL for the next page of results (if applicable).
previous: URL for the previous page of results (if applicable).

count: An integer representing the total number of roadmaps available for the specified month and year.
results: An array of roadmap objects, each containing:
id: Unique identifier for the roadmap.
activity: An object detailing the activity related to the roadmap, which includes:
id: Unique identifier for the activity.
name: Name of the activity.
activity_type: An object providing details about the type of activity, including:
id: Unique identifier for the activity type.
name: Name of the activity type.

client: An object with details about the client associated with the activity, including:
id: Unique identifier for the client.
name: Name of the client.

status: Current status of the activity.
start_date: Start date of the activity.
end_date: End date of the activity.

start_date: Start date of the roadmap.
end_date: End date of the roadmap.


Notes
If there are no roadmaps available for the specified month and year, the count will be 0 and the results array will be empty.
Ensure that the month and year parameters are valid to receive accurate results.



Create Roadmap
This endpoint allows users to create a new roadmap entry. The request requires specific parameters that define the activity and its associated dates.
Request Parameters
activity_id (integer): The unique identifier for the activity associated with the roadmap.
start_date (string): The start date of the roadmap in the format MM/DD/YYYY.
end_date (string): The end date of the roadmap in the format MM/DD/YYYY.

Example Request Body


JSON








{
  "activity_id": 1,
  "start_date": "05/08/2025",
  "end_date": "08/08/2025"
}


Expected Response
Upon successful creation of a roadmap, the API will return a response containing the details of the created roadmap entry. The response structure includes:
id (integer): The unique identifier of the newly created roadmap.
activity (object): An object representing the activity linked to the roadmap, which includes:
id (integer): The unique identifier of the activity.
name (string): The name of the activity.
activity_type (object): An object detailing the type of activity, which includes:
id (integer): The unique identifier of the activity type.
name (string): The name of the activity type.

client (object): An object representing the client associated with the activity, which includes:
id (integer): The unique identifier of the client.
name (string): The name of the client.

status (string): The current status of the activity.
start_date (string): The start date of the activity.
end_date (string): The end date of the activity.

start_date (string): The start date of the roadmap.
end_date (string): The end date of the roadmap.

Notes
Ensure that the start_date is before the end_date to avoid validation errors.
The activity_id must correspond to an existing activity in the system.

This endpoint is essential for managing roadmaps effectively and tracking the timelines of various activities.


i/roadmaps/:roadmap_id
Update Roadmap Activity
This endpoint is used to update an existing activity within a specific roadmap identified by roadmap_id. By sending a PUT request to this endpoint, you can modify the details of an activity, including its start and end dates.
Request
URL: {{gematec__host}}/api/roadmaps/:roadmap_id
Method: PUT

Request Body
The request body must be in JSON format and should include the following parameters:
activity_id (integer): The unique identifier of the activity you wish to update.
start_date (string): The new start date for the activity in the format MM/DD/YYYY.
end_date (string): The new end date for the activity in the format MM/DD/YYYY.

Example Request Body:


JSON








{
  "activity_id": 1,
  "start_date": "05/09/2025",
  "end_date": "08/10/2025"
}


Response
Upon a successful update, the response will return a JSON object containing the updated activity details. The structure of the response is as follows:
id (integer): The unique identifier of the updated activity.
activity (object): An object containing details about the activity:
id (integer): The unique identifier of the activity.
name (string): The name of the activity.
activity_type (object): An object representing the type of activity:
id (integer): The unique identifier of the activity type.
name (string): The name of the activity type.

client (object): An object representing the client associated with the activity:
id (integer): The unique identifier of the client.
name (string): The name of the client.

status (string): The current status of the activity.
start_date (string): The updated start date of the activity.
end_date (string): The updated end date of the activity.


Example Response:


JSON








{
  "id": 0,
  "activity": {
    "id": 0,
    "name": "",
    "activity_type": {
      "id": 0,
      "name": ""
    },
    "client": {
      "id": 0,
      "name": ""
    },
    "status": "",
    "start_date": "",
    "end_date": ""
  },
  "start_date": "",
  "end_date": ""
}


Summary
This endpoint allows you to effectively manage activities within a roadmap by updating their details. Ensure that the request body is correctly formatted to avoid errors and receive the expected response.


DELETE Roadmap Activity
This endpoint allows you to delete a specific activity from a roadmap identified by its roadmap_id.
Request Parameters
roadmap_id (path parameter): The unique identifier of the roadmap from which the activity will be deleted.

Request Body
The request body should be provided in JSON format and must include the following parameters:
activity_id (integer): The unique identifier of the activity that you wish to remove from the roadmap.
start_date (string): The start date of the activity in the format MM/DD/YYYY.
end_date (string): The end date of the activity in the format MM/DD/YYYY.

Expected Response
Upon successful deletion, the API will return a response indicating the status of the operation. The typical response will include:
A success message confirming the deletion of the activity.
An appropriate HTTP status code (e.g., 204 No Content) indicating that the request was successful and there is no content to return.

Notes
Ensure that the roadmap_id and activity_id provided are valid and correspond to existing records in the database.
Deleting an activity is irreversible; make sure to confirm the action before proceeding.



