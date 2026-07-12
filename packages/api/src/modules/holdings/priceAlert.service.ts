import { pino } from 'pino';
import { HoldingModel } from './holding.model.js';
import { findAllActive, markTriggered } from './priceAlert.repository.js';
import { createNotification } from '../notifications/notification.service.js';

const logger = pino({ name: 'priceAlert.service' });

export async function checkAndFireAlerts(): Promise<void> {
  const alerts = await findAllActive();
  if (alerts.length === 0) return;

  // Group by symbol to batch-fetch prices
  const symbolMap = new Map<string, number>();
  const symbols = [...new Set(alerts.map((a) => a.symbol))];

  // Fetch current prices from holdings (most recent value already stored)
  const holdings = await HoldingModel.find({ symbol: { $in: symbols } })
    .select('symbol currentPrice')
    .lean()
    .exec();

  for (const h of holdings) {
    if (h.currentPrice !== undefined && !symbolMap.has(h.symbol)) {
      symbolMap.set(h.symbol, h.currentPrice);
    }
  }

  let fired = 0;

  for (const alert of alerts) {
    const currentPrice = symbolMap.get(alert.symbol);
    if (currentPrice === undefined) continue;

    const triggered =
      (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
      (alert.condition === 'below' && currentPrice <= alert.targetPrice);

    if (!triggered) continue;

    try {
      await markTriggered(String(alert._id));

      const dir = alert.condition === 'above' ? '↑' : '↓';
      const priceFormatted = (alert.targetPrice / 100).toFixed(2);
      const currentFormatted = (currentPrice / 100).toFixed(2);

      await createNotification(String(alert.userId), {
        type: 'price_alert',
        title: `Alerta de precio: ${alert.symbol} ${dir}`,
        message: `${alert.symbol} ha ${
          alert.condition === 'above' ? 'superado' : 'bajado de'
        } ${priceFormatted} ${alert.currency}. Precio actual: ${currentFormatted} ${
          alert.currency
        }`,
        data: {
          holdingId: String(alert.holdingId),
          symbol: alert.symbol,
          condition: alert.condition,
          targetPrice: alert.targetPrice,
          currentPrice,
          currency: alert.currency,
        },
      });

      fired++;
    } catch (err) {
      logger.error({ err, alertId: String(alert._id) }, 'Failed to fire price alert');
    }
  }

  if (fired > 0) {
    logger.info({ fired }, 'Price alerts fired');
  }
}
