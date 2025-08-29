Refresh Token API
This endpoint is used to refresh an existing authentication token using a valid refresh token. It allows clients to obtain a new access token without requiring the user to re-authenticate, thereby enhancing user experience and maintaining session continuity.
Request
Method: POST
Endpoint: {{gematec__host}}/api/token/refresh

Headers
Content-Type: application/json
Authorization: Bearer token (if required by the API)

Request Body
The request body must be in JSON format and should include the following parameter:
refresh (string): The refresh token that was previously issued to the user. This token is used to validate the request and generate a new access token.

Example Request Body:


JSON








{
  "refresh": "{{refresh_token}}"
}


Response
Upon a successful request, the server will return a response containing a new access token. The expected response structure is as follows:
access (string): The newly issued access token that can be used for subsequent authenticated requests.
expires_in (integer): The duration in seconds for which the access token is valid.

Example Response:


JSON








{
  "access": "new_access_token_value",
  "expires_in": 3600
}


Authentication Requirements
Ensure that the request is authenticated as per the API's requirements. If the API requires an Authorization header, include a valid bearer token in the header for the request to be processed successfully.
This endpoint is crucial for maintaining user sessions without requiring frequent logins, thus improving the overall user experience.




