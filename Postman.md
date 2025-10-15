API Endpoint: Create Activity
This endpoint allows users to create a new activity within the system. By sending a POST request to /api/activities, users can specify the details of the activity they wish to add.
Request Body
The request must be sent in JSON format and should include the following parameters:
name (string): The name of the activity.
activity_type_id (integer): The identifier for the type of activity.
client_id (integer): The identifier for the client associated with the activity.

Example Request


JSON








{
  "name": "Ordem de Serviço ABC 3",
  "activity_type_id": 3,
  "start_date": "30/06/2025",
  "end_date": "15/07/2025",
  "client_id": 2
}


Response Structure
Upon a successful request, the API will respond with a JSON object containing the details of the created activity. The response will include the following fields:
id (integer): The unique identifier for the newly created activity.
name (string): The name of the activity.
activity_type (object): An object containing the id and name of the activity type.
client (object): An object containing the id and name of the client.
status (string): The current status of the activity.
start_date (string): The start date of the activity.
end_date (string): The end date of the activity.
opened_at (datetime|null): Timestamp when the activity was opened.
closed_at (datetime|null): Timestamp when the activity was closed.
created_at (string): Timestamp when the activity was created.
updated_at (string): Timestamp when the activity was last updated.

Example Response


JSON








{
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
  "opened_at": null,
  "closed_at": null,
  "created_at": "",
  "updated_at": ""
}


This structure provides a clear overview of the activity created and its associated details.


