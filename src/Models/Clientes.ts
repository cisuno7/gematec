
export interface Sector {
  id: number;
  name: string;
  equipment_count?: number; // Contagem de equipamentos no setor
  subsector_count?: number; // Contagem de subsetores
  level: number;
  subsectors?: Sector[];
  complete_name: string; // Adicionado
}

export interface Address {
  id: number;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  neighborhood?: string; // Adicionado
  number?: string; // Adicionado
  complement?: string; // Adicionado
  reference_point?: string; // Adicionado
  zip_code?: string; //
}

export interface Contract {
  id: number;
  start_date: string;
  end_date: string;
  activity_frequency: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface IClient {
  id: number;
  name: string;
  email: string;
  document: string | null;
  phone: string | null;
  hasContract: boolean;
  sectors: Sector[] | null;
  addresses: Address[] | null;
  // Novos campos
  fantasy_name?: string;
  state_registration?: string;
  opening_date?: string;
  total_sectors?: number;
  total_equipments?: number;
  contracts?: Contract[];
  contacts?: Contact[];
}

export default class Client implements IClient {
  id: number;
  name: string;
  email: string;
  document: string | null;
  phone: string | null;
  hasContract: boolean;
  sectors: Sector[] | null;
  addresses: Address[] | null;
  // Novos campos
  fantasy_name?: string;
  state_registration?: string;
  opening_date?: string;
  total_sectors?: number;
  total_equipments?: number;
  contracts?: Contract[];
  contacts?: Contact[];

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.document = data.document || null;
    this.phone = data.phone || null;
    this.hasContract = data.has_contract || false;
    this.sectors = data.sectors || null;
    this.addresses = data.addresses || null;
    // Novos campos
    this.fantasy_name = data.fantasy_name;
    this.state_registration = data.state_registration;
    this.opening_date = data.opening_date;
    this.total_sectors = data.total_sectors;
    this.total_equipments = data.total_equipments;
    this.contracts = data.contracts;
    this.contacts = data.contacts;
  }
}