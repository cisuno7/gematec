export default class PersonalData {
    id: number;
    name: string;
    email: string;
    document: string | null;
    rg: string | null;
    phone: string | null;
    ctps: string | null;
    rh_factor: string | null;
    birthdate: string | null;
    is_active: boolean;
    admission_date: string | null;
    group: any | null;
    role: any | null;
    last_login: string | null;
    created_at: string;
    updated_at: string;
  
    constructor(data: any) {
      this.id = data.id;
      this.name = data.name;
      this.email = data.email;
      this.document = data.document || '';
      this.rg = data.rg || '';
      this.phone = data.phone || '';
      this.ctps = data.ctps || '';
      this.rh_factor = data.rh_factor || '';
      this.birthdate = data.birthdate || '';
      this.is_active = data.is_active || false;
      this.admission_date = data.admission_date || '';
      this.group = data.group || null;
      this.role = data.role || null;
      this.last_login = data.last_login || null;
      this.created_at = data.created_at || '';
      this.updated_at = data.updated_at || '';
    }
  }
  