API Endpoint: Retrieve User Menu
Description
This endpoint allows you to retrieve the menu associated with the authenticated user. It provides a structured response containing the user's menu items, which can be utilized for display purposes in client applications.
Request
Method: GET
URL: {{gematec__host}}/api/me/menu
Authentication: This request requires user authentication. Ensure that the appropriate authentication token is included in the request headers.

Response
The response will be in JSON format and will include the following key attributes:
menuItems: An array of objects representing the individual menu items available to the user. Each object may contain properties such as id, name, description, and icon.

Example Response


JSON








{
  "menuItems": [
    {
      "id": "1",
      "name": "Dashboard",
      "description": "Overview of your activities",
      "icon": "dashboard_icon.png"
    },
    {
      "id": "2",
      "name": "Settings",
      "description": "Manage your account settings",
      "icon": "settings_icon.png"
    }
  ]
}


Notes
Ensure that the user is authenticated before making this request to avoid unauthorized access errors.



Description
This endpoint allows the client to retrieve the menu associated with the authenticated user. It is a read-only operation that provides the current user's menu items, which may include various options and settings available for their account.
Request
Method: GET
URL: {{gematec__host}}/api/me/menu

Headers
Authorization: Bearer token (required) - This header must include a valid bearer token for authentication purposes. Ensure that the token is obtained through the authentication process prior to making this request.

Response
The response will contain a JSON object representing the user's menu. The structure of the response typically includes:
menuItems: An array of menu item objects, each containing:
id: Unique identifier for the menu item.
name: The display name of the menu item.
url: The link associated with the menu item.
icon: (Optional) The icon associated with the menu item, if applicable.


Example Response


JSON








{
  "menuItems": [
    {
      "id": "1",
      "name": "Dashboard",
      "url": "/dashboard",
      "icon": "dashboard_icon"
    },
    {
      "id": "2",
      "name": "Settings",
      "url": "/settings"
    }
  ]
}


Notes
Ensure that the user is authenticated before making this request.
The response structure may vary based on user permissions and roles.



This endpoint retrieves the menu information for the authenticated user. It allows users to access their personalized menu settings and options available within the application.
Request
Method: GET
URL: {{gematec__host}}/api/me/menu

Required Parameters
This endpoint does not require any additional parameters in the request URL. However, it is essential that the request is made by an authenticated user, meaning that appropriate authentication tokens or credentials must be included in the request headers.
Example Request


Plain Text








GET {{gematec__host}}/api/me/menu
Authorization: Bearer {your_access_token}


Response
The response from this endpoint will contain the user's menu details. The structure of the response will typically include the following keys:
menuItems: An array of menu items available to the user, each containing details such as the item name, description, and any associated actions.
status: A string indicating the success or failure of the request.
message: A string providing additional information about the request status.

Example Response


JSON








{
  "menuItems": [
    {
      "name": "Dashboard",
      "description": "Access your dashboard to view analytics.",
      "action": "navigate"
    },
    {
      "name": "Profile",
      "description": "View and edit your profile settings.",
      "action": "navigate"
    }
  ],
  "status": "success",
  "message": "Menu retrieved successfully."
}


Notes
Ensure that the user is authenticated before making this request.
The response structure may vary based on the user's role and permissions within the application.





