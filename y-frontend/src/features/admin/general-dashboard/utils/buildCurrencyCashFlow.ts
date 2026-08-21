import type { GeneralDashboardData } from "../hooks/useGeneralDashboard";

export type CurrencyCashFlowRow = {
  currencyCode: string;
  currencyName: string;
  cashIn: number;
  cashOut: number;
  sarafCashIn: number;
  sarafCashOut: number;
  expensesCash: number;
  paddyBoughtCash: number;
  jwaliCash: number;
  netBusinessCash: number;
};

type CurrencyAmountRow = {
  currencyCode: string;
  currencyName: string;
  cashPaidAmount?: string;
  cashIn?: string;
  cashOut?: string;
};

function toAmountMap(
  rows: CurrencyAmountRow[] | undefined,
  field: "cashPaidAmount" | "cashIn" | "cashOut",
) {
  const map = new Map<string, { currencyName: string; amount: number }>();

  for (const row of rows ?? []) {
    map.set(row.currencyCode, {
      currencyName: row.currencyName,
      amount: Number(row[field] ?? row.cashPaidAmount ?? 0),
    });
  }

  return map;
}

function toCashLedgerMap(
  data: GeneralDashboardData,
  field: "cashIn" | "cashOut" | "availableCash",
) {
  const map = new Map<string, { currencyName: string; amount: number }>();

  for (const row of data.cashDashboard?.currencyBalances ?? []) {
    const amount =
      field === "availableCash"
        ? Number(row.availableCash ?? row.balance ?? 0)
        : field === "cashIn"
          ? Number(row.cashIn ?? 0)
          : Number(row.cashOut ?? 0);

    map.set(row.currencyCode, {
      currencyName: row.currencyName,
      amount,
    });
  }

  return map;
}

function collectCurrencyCodes(
  ...maps: Array<Map<string, { currencyName: string; amount: number }>>
) {
  const codes = new Set<string>();

  for (const map of maps) {
    for (const code of map.keys()) {
      codes.add(code);
    }
  }

  return [...codes].sort((left, right) => left.localeCompare(right));
}

function lookupAmount(
  map: Map<string, { currencyName: string; amount: number }>,
  currencyCode: string,
) {
  return map.get(currencyCode)?.amount ?? 0;
}

function lookupName(
  map: Map<string, { currencyName: string; amount: number }>,
  currencyCode: string,
  fallback: string,
) {
  return map.get(currencyCode)?.currencyName ?? fallback;
}

export function buildCurrencyCashFlowRows(
  data: GeneralDashboardData,
): CurrencyCashFlowRow[] {
  const riceSalesCash = toAmountMap(
    data.riceSalesCashSummary?.byCurrency,
    "cashPaidAmount",
  );
  const storeSalesCash = toAmountMap(
    data.storeCashSummary?.byCurrency,
    "cashPaidAmount",
  );
  const expenseCash = toAmountMap(
    data.expenseCashSummary?.byCurrency,
    "cashPaidAmount",
  );
  const paddyCash = toAmountMap(
    data.paddyCashSummary?.byCurrency,
    "cashPaidAmount",
  );
  const sarafCashIn = toAmountMap(data.sarafCashSummary?.byCurrency, "cashIn");
  const sarafCashOut = toAmountMap(data.sarafCashSummary?.byCurrency, "cashOut");
  const jwaliCash = toAmountMap(data.jwaliCashSummary?.byCurrency, "cashPaidAmount");
  const cashBalances = toCashLedgerMap(data, "availableCash");
  const ledgerCashIn = toCashLedgerMap(data, "cashIn");
  const ledgerCashOut = toCashLedgerMap(data, "cashOut");

  const currencyCodes = collectCurrencyCodes(
    riceSalesCash,
    storeSalesCash,
    expenseCash,
    paddyCash,
    sarafCashIn,
    sarafCashOut,
    jwaliCash,
    cashBalances,
    ledgerCashIn,
    ledgerCashOut,
  );

  return currencyCodes.map((currencyCode) => {
    const cashIn =
      lookupAmount(riceSalesCash, currencyCode) +
      lookupAmount(storeSalesCash, currencyCode);
    const expensesCash = lookupAmount(expenseCash, currencyCode);
    const paddyBoughtCash = lookupAmount(paddyCash, currencyCode);
    const jwaliCashAmount = lookupAmount(jwaliCash, currencyCode);
    const cashAvailableBalance = lookupAmount(cashBalances, currencyCode);
    const cashOut =
      data.cashDashboard !== null
        ? lookupAmount(ledgerCashOut, currencyCode)
        : expensesCash + paddyBoughtCash + jwaliCashAmount;
    const cashInTotal =
      data.cashDashboard !== null
        ? lookupAmount(ledgerCashIn, currencyCode)
        : cashIn;

    return {
      currencyCode,
      currencyName: lookupName(
        cashBalances,
        currencyCode,
        lookupName(
          riceSalesCash,
          currencyCode,
          lookupName(
            storeSalesCash,
            currencyCode,
            lookupName(
              expenseCash,
              currencyCode,
              lookupName(
                paddyCash,
                currencyCode,
                lookupName(
                  sarafCashIn,
                  currencyCode,
                  lookupName(jwaliCash, currencyCode, currencyCode),
                ),
              ),
            ),
          ),
        ),
      ),
      cashIn: cashInTotal,
      cashOut,
      sarafCashIn: lookupAmount(sarafCashIn, currencyCode),
      sarafCashOut: lookupAmount(sarafCashOut, currencyCode),
      expensesCash,
      paddyBoughtCash,
      jwaliCash: jwaliCashAmount,
      netBusinessCash:
        data.cashDashboard !== null
          ? cashAvailableBalance
          : cashIn - expensesCash - paddyBoughtCash - jwaliCashAmount,
    };
  });
}
