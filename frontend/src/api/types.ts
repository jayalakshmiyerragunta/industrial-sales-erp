export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SALES';
}

export interface Customer {
  id: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string | null;
  city: string;
  createdAt: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  basePrice: string;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
}

export interface InventoryRow {
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  category: string;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
}

export interface EnquiryItemRow {
  id: string;
  productId: string;
  quantity: number;
  product?: { id: string; code: string; name: string; unit: string };
}

export interface Enquiry {
  id: string;
  enquiryNo: string;
  customerId: string;
  requiredDate: string | null;
  notes: string | null;
  status: 'NEW' | 'QUOTED' | 'WON' | 'LOST';
  createdAt: string;
  customer?: { id: string; companyName: string; city: string; contactPerson: string };
  items?: EnquiryItemRow[];
  quotations?: { id: string; quotationNo: string; status: string; totalAmount: string }[];
}

export interface QuotationItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  discountPct: string;
  gstPct: string;
  lineAmount: string;
  product?: { id: string; code: string; name: string; unit: string };
}

export interface Quotation {
  id: string;
  quotationNo: string;
  validUntil: string | null;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  totalAmount: string;
  createdAt: string;
  enquiry?: { id: string; enquiryNo: string };
  customer?: { id: string; companyName: string; city: string };
  items?: QuotationItem[];
  salesOrder?: { id: string; orderNo: string; status: string } | null;
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  totalAmount: string;
  status: 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'CANCELLED';
  createdAt: string;
  customer?: { id: string; companyName: string; city: string };
  quotation?: { id: string; quotationNo: string };
  items?: { id: string; productId: string; quantity: number; unitPrice: string; lineAmount: string; product?: { id: string; code: string; name: string } }[];
  dispatches?: { id: string; dispatchNo: string; dispatchDate: string; vehicleNumber: string }[];
}

export interface Dispatch {
  id: string;
  dispatchNo: string;
  dispatchDate: string;
  vehicleNumber: string;
  driverName: string;
  salesOrder?: { id: string; orderNo: string; status: string; customer?: { companyName: string } };
  items?: { id: string; productId: string; quantity: number; product?: { code: string; name: string } }[];
}