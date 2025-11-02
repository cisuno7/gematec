[
    {
        "id": 1,
        "activity_plan_id": 1,
        "activity_plan_version_id": 1,
        "status": "created",
        "equipment": {
            "id": 1,
            "version": 1,
            "qrcode": "2c2c5118-f960-41c4-a2dd-aa2a4a811891",
            "tag": "NP068",
            "client": {
                "id": 1,
                "name": "João Pereira"
            },
            "sector": {
                "id": 1,
                "complete_name": "Cozinha"
            },
            "brand": {
                "id": 1,
                "name": "Xiaomi"
            },
            "equipment_type": {
                "id": 1,
                "name": "Piso teto"
            },
            "additional_fields": {},
            "is_active": true,
            "created_at": "31/08/2025 05:23",
            "updated_at": "31/08/2025 05:23"
        },
        "opened_at": null,
        "opened_by": null,
        "closed_at": null,
        "closed_by": null
    },
    {
        "id": 2,
        "activity_plan_id": 1,
        "activity_plan_version_id": 1,
        "status": "created",
        "equipment": {
            "id": 2,
            "version": 1,
            "qrcode": "06374118-abd8-49d0-adff-9ece77db8dce",
            "tag": "NP068",
            "client": {
                "id": 1,
                "name": "João Pereira"
            },
            "sector": {
                "id": 1,
                "complete_name": "Cozinha"
            },
            "brand": {
                "id": 1,
                "name": "Xiaomi"
            },
            "equipment_type": {
                "id": 1,
                "name": "Piso teto"
            },
            "additional_fields": {},
            "is_active": true,
            "created_at": "31/08/2025 05:25",
            "updated_at": "31/08/2025 05:25"
        },
        "opened_at": null,
        "opened_by": null,
        "closed_at": null,
        "closed_by": null
    },
    {
        "id": 3,
        "activity_plan_id": 1,
        "activity_plan_version_id": 1,
        "status": "created",
        "equipment": {
            "id": 3,
            "version": 1,
            "qrcode": "78b1e366-4217-47f6-8666-b0493fd7c854",
            "tag": "NP069",
            "client": {
                "id": 1,
                "name": "João Pereira"
            },
            "sector": {
                "id": 1,
                "complete_name": "Cozinha"
            },
            "brand": {
                "id": 1,
                "name": "Xiaomi"
            },
            "equipment_type": {
                "id": 1,
                "name": "Piso teto"
            },
            "additional_fields": {},
            "is_active": true,
            "created_at": "31/08/2025 05:26",
            "updated_at": "31/08/2025 05:26"
        },
        "opened_at": null,
        "opened_by": null,
        "closed_at": null,
        "closed_by": null
    },
    {
        "id": 4,
        "activity_plan_id": 1,
        "activity_plan_version_id": 1,
        "status": "created",
        "equipment": {
            "id": 4,
            "version": 1,
            "qrcode": "472678ec-5208-4068-820d-17c9274a7475",
            "tag": "NP069",
            "client": {
                "id": 1,
                "name": "João Pereira"
            },
            "sector": {
                "id": 1,
                "complete_name": "Cozinha"
            },
            "brand": {
                "id": 1,
                "name": "Xiaomi"
            },
            "equipment_type": {
                "id": 1,
                "name": "Piso teto"
            },
            "additional_fields": {},
            "is_active": true,
            "created_at": "31/08/2025 06:06",
            "updated_at": "31/08/2025 06:06"
        },
        "opened_at": null,
        "opened_by": null,
        "closed_at": null,
        "closed_by": null
    },
    {
        "id": 5,
        "activity_plan_id": 1,
        "activity_plan_version_id": 1,
        "status": "created",
        "equipment": {
            "id": 5,
            "version": 1,
            "qrcode": "7ca45f29-4e22-4618-8df5-37998e815460",
            "tag": "NP069",
            "client": {
                "id": 1,
                "name": "João Pereira"
            },
            "sector": {
                "id": 1,
                "complete_name": "Cozinha"
            },
            "brand": {
                "id": 1,
                "name": "Xiaomi"
            },
            "equipment_type": {
                "id": 1,
                "name": "Piso teto"
            },
            "additional_fields": {},
            "is_active": true,
            "created_at": "31/08/2025 06:18",
            "updated_at": "31/08/2025 06:18"
        },
        "opened_at": null,
        "opened_by": null,
        "closed_at": null,
        "closed_by": null
    }
]
Add Equipment
This endpoint allows users to add a new equipment entry to the system. It requires specific parameters to be provided in the request body, which detail the equipment's attributes.
Request Body Parameters
The request body should be formatted as a JSON object containing the following parameters:
client_id (integer): The ID of the client associated with the equipment.
sector_id (integer): The ID of the sector where the equipment is located.
brand_id (integer): The ID of the brand of the equipment.
equipment_type_id (integer): The ID that specifies the type of equipment.
tag (string): A unique identifier or tag for the equipment.
additional_fields (object): An object containing any extra fields related to the equipment. For example:
fruta_preferida_1 (object): This can include:
label (string): A label for the additional field.
value (string): The value associated with the label.
justification (string): Any justification for the value provided.



Response Structure
Upon successful creation of the equipment, the API will return a JSON object with the following structure:
id (integer): The unique identifier for the newly created equipment.
version (integer): The version of the equipment record.
qrcode (string): A QR code associated with the equipment.
tag (string): The tag provided in the request.
client (object): An object containing:
id (integer): The ID of the client.
name (string): The name of the client.

sector (object): An object containing:
id (integer): The ID of the sector.
complete_name (string): The complete name of the sector.

brand (object): An object containing:
id (integer): The ID of the brand.
name (string): The name of the brand.

equipment_type (object): An object containing:
id (integer): The ID of the equipment type.
name (string): The name of the equipment type.

additional_fields (object): An object that may include additional information such as:
compressor_type (object): Contains:
value (string): The value for the compressor type.
label (string): The label for the compressor type.


is_active (boolean): Indicates whether the equipment is active.
created_at (string): Timestamp of when the equipment was created.
updated_at (string): Timestamp of the last update to the equipment record.

This structure provides a comprehensive overview of the equipment added and its associated details.


{
    "client_id": 1,
    "sector_id": 1,
    "brand_id": 1,
    "equipment_type_id": 2,
    "tag": "E015",
    "additional_fields": {
        "q1et2": {
            "value": "Resposta",
            "justification": null
        },
        "q2et2": {            
            "value": 13,
            "justification": ""
        },
        "q3et2": {
            "value": "Option B",
            "justification": ""
        },
        "q4et2": {
            "value": "Option B",
            "justification": ""
        },
        "q5et2": {
            "value": "Option A",
            "justification": "Justificativa"
        }
    }
}