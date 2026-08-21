import {
  createElement,
} from "react";
import {
  Navigate,
  type RouteObject,
} from "react-router-dom";
import {
  type LucideIcon,
  CalendarDays,
  ContactRound,
  Factory,
  LayoutDashboard,
  PackageOpen,
  Package2,
  Truck,
  Users,
  FileBarChart2,
  Sprout,
  Banknote,
  Landmark,
} from "lucide-react";
import type { TFunction } from "i18next";
import { CustomerAccountPage } from "./customer/components/CustomerAccountPage";
import { CustomerList as CustomerPage } from "./customer/components/CustomerList";
import { EmployeeAccountPage } from "./employees/components/EmployeeAccountPage";
import { EmployeeDashboard } from "./employees/components/EmployeeDashboard";
import { EmployeeList as EmployeesPage } from "./employees/components/EmployeeList";
import { JwaliAccountPage } from "./jwali/components/JwaliAccountPage";
import { JwaliList as JwaliPage } from "./jwali/components/JwaliList";
import { SarafiAccountPage } from "./sarafi/components/SarafiAccountPage";
import { SarafiList as SarafiPage } from "./sarafi/components/SarafiList";
import { EnteringPaddyDashboard as EnteringPaddyDashboardPage } from "./entering-paddy/components/EnteringPaddyDashboard";
import { EnteringPaddyList as EnteringPaddyPage } from "./entering-paddy/components/EnteringPaddyList";
import { ExpenseList as ExpensesPage } from "./expenses/components/ExpenseList";
import { ExpenseDashboard as ExpenseDashboardPage } from "./expenses/components/ExpenseDashboard";
import { PaddyProcessDashboard as PaddyProcessDashboardPage } from "./paddy-process/components/PaddyProcessDashboard";
import { PaddyProcessList as PaddyProcessPage } from "./paddy-process/components/PaddyProcessList";
import { PaddyWarehouseDashboard as PaddyWarehouseDashboardPage } from "./paddy-warehouses/components/PaddyWarehouseDashboard";
import { RiceWarehouseDashboard as RiceWarehouseDashboardPage } from "./rice-warehouses/components/RiceWarehouseDashboard";
import { FarmerOwnedPaddyWarehouseList as FarmerOwnedPaddyWarehousesPage } from "./paddy-warehouses/components/FarmerOwnedPaddyWarehouseList";
import { PaddyWarehouseList as PaddyWarehousesPage } from "./paddy-warehouses/components/PaddyWarehouseList";
import { RiceWarehouseList as RiceWarehousesPage } from "./rice-warehouses/components/RiceWarehouseList";
import { SeasonList as SeasonsPage } from "./seasons/components/SeasonList";
import { ProcessRiceList as ProcessRicePage } from "./process-rice/components/ProcessRiceList";
import { RiceSaleList as RiceSalesPage } from "./rice-sales/components/RiceSaleList";
import { RiceCharityList as RiceCharitiesPage } from "./rice-charities/components/RiceCharityList";
import { CurrencyList as CurrenciesPage } from "./currencies/components/CurrencyList";
import { ExpenseCategoryList as ExpenseCategoriesPage } from "./expense-categories/components/ExpenseCategoryList";
import { StoreDashboard as StoreDashboardPage } from "./store/components/StoreDashboard";
import {
  BrokenRiceStorePage,
  RegectionStorePage,
  ShortGreenStorePage,
  WasteStorePage,
} from "./store/components/StoreEntryList";
import { ReportsPage } from "./reports/components/ReportsPage";
import { InvestorDashboard } from "./investors/components/InvestorDashboard";
import { InvestorList as InvestorsPage } from "./investors/components/InvestorList";
import { VarietyList as VerietyListPage } from "./verieties/components/VarietyList";
import { GeneralDashboardPage } from "./general-dashboard/components/GeneralDashboardPage";
import { CashDashboard as CashDashboardPage } from "./cash/components/CashDashboard";
import { CashTransactionList as CashTransactionsPage } from "./cash/components/CashTransactionList";

const generalDashboardRoutes: RouteObject[] = [
  {
    path: "dashboard",
    children: [
      {
        index: true,
        Component: GeneralDashboardPage,
      },
    ],
  },
];

const seasonRoutes: RouteObject[] = [
  {
    path: "admin",
    children: [
      {
        index: true,
        element: createElement(Navigate, {
          to: "/yk/seasons/new-season",
          replace: true,
        }),
      },
      {
        path: "seasons",
        element: createElement(Navigate, {
          to: "/yk/seasons/new-season",
          replace: true,
        }),
      },
      {
        path: "seasons/*",
        element: createElement(Navigate, {
          to: "/yk/seasons/new-season",
          replace: true,
        }),
      },
      {
        path: "paddy-warehouses",
        element: createElement(Navigate, {
          to: "/yk/paddy-dashboard",
          replace: true,
        }),
      },
      {
        path: "entering-paddy",
        element: createElement(Navigate, {
          to: "/yk/entering-paddy-dashboard",
          replace: true,
        }),
      },
      {
        path: "customers",
        element: createElement(Navigate, {
          to: "/yk/customers",
          replace: true,
        }),
      },
      {
        path: "rice-warehouses",
        element: createElement(Navigate, {
          to: "/yk/rice-dashboard",
          replace: true,
        }),
      },
      {
        path: "stores",
        element: createElement(Navigate, {
          to: "/yk/stores/short-green",
          replace: true,
        }),
      },
      {
        path: "expenses",
        element: createElement(Navigate, {
          to: "/yk/expenses-dashboard",
          replace: true,
        }),
      },
      {
        path: "employees",
        element: createElement(Navigate, {
          to: "/yk/employees-dashboard",
          replace: true,
        }),
      },
      {
        path: "jwali",
        element: createElement(Navigate, {
          to: "/yk/jwali",
          replace: true,
        }),
      },
      {
        path: "sarafi",
        element: createElement(Navigate, {
          to: "/yk/sarafi",
          replace: true,
        }),
      },
      {
        path: "investors",
        element: createElement(Navigate, {
          to: "/yk/investors-dashboard",
          replace: true,
        }),
      },
      {
        path: "reports",
        element: createElement(Navigate, {
          to: "/yk/reports",
          replace: true,
        }),
      },
      {
        path: "verieties",
        element: createElement(Navigate, {
          to: "/yk/verieties/rice",
          replace: true,
        }),
      },
    ],
  },
  {
    path: "seasons",
    children: [
      {
        index: true,
        element: createElement(Navigate, {
          to: "/yk/seasons/new-season",
          replace: true,
        }),
      },
      {
        path: "new-season",
        Component: SeasonsPage,
      },
    ],
  },
];

const enteringPaddyRoutes: RouteObject[] = [
  {
    path: "entering-paddy-dashboard",
    children: [
      {
        index: true,
        Component: EnteringPaddyDashboardPage,
      },
    ],
  },
  {
    path: "entering-paddy",
    children: [
      {
        index: true,
        Component: EnteringPaddyPage,
      },
    ],
  },
  {
    path: "customers",
    children: [
      {
        index: true,
        Component: CustomerPage,
      },
      {
        path: ":id",
        Component: CustomerAccountPage,
      },
    ],
  },
];

const paddyWarehouseRoutes: RouteObject[] = [
  {
    path: "paddy-dashboard",
    children: [
      {
        index: true,
        Component: PaddyWarehouseDashboardPage,
      },
    ],
  },
  {
    path: "campany_owned_paddy",
    children: [
      {
        index: true,
        Component: PaddyWarehousesPage,
      },
    ],
  },
  {
    path: "farmer_owned_paddy",
    children: [
      {
        index: true,
        Component: FarmerOwnedPaddyWarehousesPage,
      },
    ],
  },
  {
    path: "paddy-process-dashboard",
    children: [
      {
        index: true,
        Component: PaddyProcessDashboardPage,
      },
    ],
  },
  {
    path: "paddy_process",
    children: [
      {
        index: true,
        Component: PaddyProcessPage,
      },
    ],
  },
];

const riceWarehouseRoutes: RouteObject[] = [
  {
    path: "rice-dashboard",
    children: [
      {
        index: true,
        Component: RiceWarehouseDashboardPage,
      },
    ],
  },
  {
    path: "rice_warehouse",
    children: [
      {
        index: true,
        Component: RiceWarehousesPage,
      },
    ],
  },
  {
    path: "process-rice",
    children: [
      {
        index: true,
        Component: ProcessRicePage,
      },
    ],
  },
  {
    path: "rice-sales",
    children: [
      {
        index: true,
        Component: RiceSalesPage,
      },
    ],
  },
  {
    path: "rice-charity",
    children: [
      {
        index: true,
        Component: RiceCharitiesPage,
      },
    ],
  },
];

const storeRoutes: RouteObject[] = [
  {
    path: "stores",
    children: [
      {
        index: true,
        element: createElement(Navigate, {
          to: "/yk/stores/dashboard",
          replace: true,
        }),
      },
      {
        path: "dashboard",
        Component: StoreDashboardPage,
      },
      {
        path: "short-green",
        Component: ShortGreenStorePage,
      },
      {
        path: "regection",
        Component: RegectionStorePage,
      },
      {
        path: "broken-rice",
        Component: BrokenRiceStorePage,
      },
      {
        path: "waste",
        Component: WasteStorePage,
      },
    ],
  },
];

const expenseRoutes: RouteObject[] = [
  {
    path: "expenses-dashboard",
    children: [
      {
        index: true,
        Component: ExpenseDashboardPage,
      },
    ],
  },
  {
    path: "expenses",
    children: [
      {
        index: true,
        Component: ExpensesPage,
      },
    ],
  },
];

const currencyRoutes: RouteObject[] = [
  {
    path: "currencies",
    children: [
      {
        index: true,
        Component: CurrenciesPage,
      },
    ],
  },
];

const cashRoutes: RouteObject[] = [
  {
    path: "cash-dashboard",
    children: [
      {
        index: true,
        Component: CashDashboardPage,
      },
    ],
  },
  {
    path: "cash",
    children: [
      {
        index: true,
        Component: CashTransactionsPage,
      },
    ],
  },
];

const expenseCategoryRoutes: RouteObject[] = [
  {
    path: "expense-categories",
    children: [
      {
        index: true,
        Component: ExpenseCategoriesPage,
      },
    ],
  },
];

const employeeRoutes: RouteObject[] = [
  {
    path: "employees-dashboard",
    Component: EmployeeDashboard,
  },
  {
    path: "employees",
    Component: EmployeesPage,
  },
  {
    path: "employees/:id",
    Component: EmployeeAccountPage,
  },
];

const investorRoutes: RouteObject[] = [
  {
    path: "investors-dashboard",
    Component: InvestorDashboard,
  },
  {
    path: "investors",
    Component: InvestorsPage,
  },
];

const jwaliRoutes: RouteObject[] = [
  {
    path: "jwali",
    Component: JwaliPage,
  },
  {
    path: "jwali/:id",
    Component: JwaliAccountPage,
  },
];

const sarafiRoutes: RouteObject[] = [
  {
    path: "sarafi",
    Component: SarafiPage,
  },
  {
    path: "sarafi/:id",
    Component: SarafiAccountPage,
  },
];

const reportRoutes: RouteObject[] = [
  {
    path: "reports",
    children: [
      {
        index: true,
        Component: ReportsPage,
      },
    ],
  },
];

const verietiesRoutes: RouteObject[] = [
  {
    path: "verieties",
    children: [
      {
        index: true,
        element: createElement(Navigate, {
          to: "/yk/verieties/rice",
          replace: true,
        }),
      },
      {
        path: ":kind",
        Component: VerietyListPage,
      },
    ],
  },
];

export type AdminMenuItem = {
  name: string;
  url: string;
  icon: LucideIcon;
  children?: {
    name: string;
    url: string;
  }[];
};

export function getSeasonMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:season:season"),
      url: "/yk/seasons",
      icon: CalendarDays,
      children: [
        {
          name: t("sidebar:season:new_season"),
          url: "/yk/seasons/new-season",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getPaddyWarehouseMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:paddy_warehouse:paddy_warehouse"),
      url: "/yk/paddy-dashboard",
      icon: LayoutDashboard,
      children: [
        {
          name: t("sidebar:paddy_warehouse:dashboard"),
          url: "/yk/paddy-dashboard",
        },
        {
          name: t("sidebar:paddy_warehouse:company_owned"),
          url: "/yk/campany_owned_paddy",
        },
        {
          name: t("sidebar:paddy_warehouse:farmer_owned"),
          url: "/yk/farmer_owned_paddy",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getPaddyProcessMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:paddy_process:paddy_process"),
      url: "/yk/paddy-process-dashboard",
      icon: Factory,
      children: [
        {
          name: t("sidebar:paddy_process:dashboard"),
          url: "/yk/paddy-process-dashboard",
        },
        {
          name: t("sidebar:paddy_process:records"),
          url: "/yk/paddy_process",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getCustomerMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:customer:customer"),
      url: "/yk/customers",
      icon: ContactRound,
      children: [
        {
          name: t("sidebar:customer:customers"),
          url: "/yk/customers",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getEnteringPaddyMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:entering_paddy:entering_paddy"),
      url: "/yk/entering-paddy-dashboard",
      icon: Truck,
      children: [
        {
          name: t("sidebar:entering_paddy:dashboard"),
          url: "/yk/entering-paddy-dashboard",
        },
        {
          name: t("sidebar:entering_paddy:records"),
          url: "/yk/entering-paddy",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getRiceWarehouseMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:rice_warehouse:rice_warehouse"),
      url: "/yk/rice-dashboard",
      icon: Package2,
      children: [
        {
          name: t("sidebar:rice_warehouse:dashboard"),
          url: "/yk/rice-dashboard",
        },
        {
          name: t("sidebar:rice_warehouse:rice"),
          url: "/yk/rice_warehouse",
        },
        {
          name: t("sidebar:rice_warehouse:process_rice"),
          url: "/yk/process-rice",
        },
        {
          name: t("sidebar:rice_warehouse:rice_sales"),
          url: "/yk/rice-sales",
        },
        {
          name: t("sidebar:rice_warehouse:rice_charity"),
          url: "/yk/rice-charity",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getStoreMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:store:store"),
      url: "/yk/stores/dashboard",
      icon: PackageOpen,
      children: [
        {
          name: t("sidebar:store:dashboard"),
          url: "/yk/stores/dashboard",
        },
        {
          name: t("sidebar:store:short_green"),
          url: "/yk/stores/short-green",
        },
        {
          name: t("sidebar:store:regection"),
          url: "/yk/stores/regection",
        },
        {
          name: t("sidebar:store:broken_rice"),
          url: "/yk/stores/broken-rice",
        },
        {
          name: t("sidebar:store:waste"),
          url: "/yk/stores/waste",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getExpenseMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:expenses:expenses"),
      url: "/yk/expenses-dashboard",
      icon: PackageOpen,
      children: [
        {
          name: t("sidebar:expenses:dashboard"),
          url: "/yk/expenses-dashboard",
        },
        {
          name: t("sidebar:expenses:records"),
          url: "/yk/expenses",
        },
        {
          name: t("sidebar:expenses:categories"),
          url: "/yk/expense-categories",
        },
        {
          name: t("sidebar:expenses:currencies"),
          url: "/yk/currencies",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getEmployeeMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:employees:employees"),
      url: "/yk/employees-dashboard",
      icon: Users,
      children: [
        {
          name: t("sidebar:employees:dashboard"),
          url: "/yk/employees-dashboard",
        },
        {
          name: t("sidebar:employees:records"),
          url: "/yk/employees",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getCashMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:cash:cash"),
      url: "/yk/cash-dashboard",
      icon: Banknote,
      children: [
        {
          name: t("sidebar:cash:dashboard"),
          url: "/yk/cash-dashboard",
        },
        {
          name: t("sidebar:cash:records"),
          url: "/yk/cash",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getJwaliMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:jwali:jwali"),
      url: "/yk/jwali",
      icon: Users,
      children: [
        {
          name: t("sidebar:jwali:records"),
          url: "/yk/jwali",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getInvestorMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:investor:investors"),
      url: "/yk/investors-dashboard",
      icon: Landmark,
      children: [
        {
          name: t("sidebar:investor:dashboard"),
          url: "/yk/investors-dashboard",
        },
        {
          name: t("sidebar:investor:records"),
          url: "/yk/investors",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getSarafiMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:sarafi:sarafi"),
      url: "/yk/sarafi",
      icon: Banknote,
      children: [
        {
          name: t("sidebar:sarafi:records"),
          url: "/yk/sarafi",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getReportMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:reports:reports"),
      url: "/yk/reports",
      icon: FileBarChart2,
      children: [
        {
          name: t("sidebar:reports:summary"),
          url: "/yk/reports",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export function getVerietyMenus(t: TFunction) {
  return [
    {
      name: t("sidebar:veriety:veriety"),
      url: "/yk/verieties/rice",
      icon: Sprout,
      children: [
        {
          name: t("sidebar:veriety:rice_veriety"),
          url: "/yk/verieties/rice",
        },
        {
          name: t("sidebar:veriety:paddy_veriety"),
          url: "/yk/verieties/paddy",
        },
      ],
    },
  ] satisfies AdminMenuItem[];
}

export {
  generalDashboardRoutes,
  currencyRoutes,
  expenseCategoryRoutes,
  cashRoutes,
  employeeRoutes,
  investorRoutes,
  expenseRoutes,
  seasonRoutes,
  enteringPaddyRoutes,
  paddyWarehouseRoutes,
  riceWarehouseRoutes,
  storeRoutes,
  jwaliRoutes,
  sarafiRoutes,
  reportRoutes,
  verietiesRoutes,
};
