export const ACTIVE_LINKS_LAST_HOUR: {
  name: string;
  linkId: string;
  clickCount: number;
  lastClicked: string | null;
}[] = [
  {
    name: "Amazon Bluetooth Headphones",
    linkId: "dAd5d",
    clickCount: 23,
    lastClicked: "2024-01-15T14:32:18Z",
  },
  {
    name: "Apple AirPods",
    linkId: "eFg6e",
    clickCount: 15,
    lastClicked: "2024-01-15T14:28:45Z",
  },
  {
    name: "Samsung Galaxy Buds",
    linkId: "fHj7f",
    clickCount: 31,
    lastClicked: "2024-01-15T14:35:22Z",
  },
  {
    name: "Sony WH-1000XM4",
    linkId: "gKl8g",
    clickCount: 8,
    lastClicked: "2024-01-15T14:15:33Z",
  },
  {
    name: "Bose QuietComfort",
    linkId: "hMn9h",
    clickCount: 12,
    lastClicked: null,
  },
];

export const LAST_30_DAYS_BY_COUNTRY: {
  country: string | null;
  count: number;
}[] = [
  {
    country: "US",
    count: 1247,
  },
  {
    country: "GB",
    count: 892,
  },
  {
    country: "CA",
    count: 634,
  },
  {
    country: "DE",
    count: 521,
  },
  {
    country: "FR",
    count: 487,
  },
  {
    country: "AU",
    count: 356,
  },
  {
    country: "JP",
    count: 298,
  },
  {
    country: "BR",
    count: 245,
  },
  {
    country: "IT",
    count: 189,
  },
  {
    country: "ES",
    count: 167,
  },
  {
    country: null,
    count: 143,
  },
];


export const EVALUATION_ISSUES: {
  id: string;
  linkId: string;
  accountId: string;
  destinationUrl: string;
  status: string;
  reason: string;
  createdAt: string;
}[] = [
  {
    id: "eval_001",
    linkId: "dAd5d",
    accountId: "acc_123",
    destinationUrl: "https://amazon.com/bluetooth-headphones",
    status: "pending",
    reason: "Suspicious redirect pattern detected",
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "eval_002",
    linkId: "eFg6e",
    accountId: "acc_456",
    destinationUrl: "https://apple.com/airpods",
    status: "resolved",
    reason: "Content policy violation",
    createdAt: "2024-01-14T16:45:00Z",
  },
  {
    id: "eval_003",
    linkId: "fHj7f",
    accountId: "acc_789",
    destinationUrl: "https://samsung.com/galaxy-buds",
    status: "flagged",
    reason: "Potential malware detected",
    createdAt: "2024-01-15T08:20:00Z",
  },
];

export const EVALUATIONS: {
  id: string;
  linkId: string;
  accountId: string;
  destinationUrl: string;
  status: string;
  reason: string;
  createdAt: string;
}[] = [
  {
    id: "eval_004",
    linkId: "dAd5d",
    accountId: "acc_123",
    destinationUrl: "https://amazon.com/bluetooth-headphones",
    status: "pending",
    reason: "Suspicious redirect pattern detected",
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "eval_005",
    linkId: "eFg6e",
    accountId: "acc_456",
    destinationUrl: "https://apple.com/airpods",
    status: "resolved",
    reason: "Content policy violation",
    createdAt: "2024-01-14T16:45:00Z",
  },
  {
    id: "eval_006",
    linkId: "fHj7f",
    accountId: "acc_789",
    destinationUrl: "https://samsung.com/galaxy-buds",
    status: "flagged",
    reason: "Potential malware detected",
    createdAt: "2024-01-15T08:20:00Z",
  },
];
