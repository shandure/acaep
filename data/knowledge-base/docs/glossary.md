# TradeLens Glossary

## Settlement Cycle
The period between trade execution and the final exchange of securities and cash. Standard equity settlement in most markets is T+2, meaning the trade settles two business days after the trade date. For example, a trade executed on Monday settles on Wednesday (assuming no public holidays). The T+2 cycle was introduced to reduce counterparty risk and replace the older T+3 standard.

## Mark to Market (MtM)
The practice of revaluing a position at current market prices rather than its original cost. TradeLens recalculates mark-to-market values at end-of-day using closing prices from the market data feed. An unrealised gain or loss is the difference between the MtM value and the original trade price.

## Counterparty Risk
The risk that the other party in a transaction defaults before the settlement date. In TradeLens, counterparty risk is mitigated by requiring all trades to settle through a Central Counterparty Clearing House (CCP), which acts as buyer to every seller and seller to every buyer.

## Order Book
A real-time list of buy and sell orders for a security, organised by price level. Buy orders (bids) are listed highest-first; sell orders (asks) are listed lowest-first. The spread is the difference between the best bid and best ask price.

## Position
The total quantity of a security held by a trader at any point in time. A long position means the trader owns the security (bought more than sold). A short position means the trader has sold more than they own and must buy back to close.

## Trade Lifecycle
The sequence of states a trade moves through from creation to completion:
1. **Pending** — trade submitted, awaiting settlement
2. **Settled** — cash and securities exchanged at T+2
3. **Cancelled** — trade voided before settlement (only possible while pending)

## Corporate Actions
Events initiated by a company that affect its securities, such as dividends, stock splits, mergers, or rights issues. TradeLens tracks ex-dividend dates and adjusts position valuations accordingly.

## Regulatory Reporting
TradeLens generates reports compliant with MiFID II (EU) and EMIR (UK) requirements. Trade reports must be submitted to the relevant trade repository within T+1 of execution.
