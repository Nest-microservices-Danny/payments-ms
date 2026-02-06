/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { envs, NATS_SERVICES } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dtos/payment-session.dto';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecret);
  private readonly logger = new Logger('PaymentsService');

  constructor(
    @Inject(NATS_SERVICES) private readonly natsClient: ClientProxy,
  ) {}

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;
    const lineItems = items.map((item) => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Convert to the smallest currency unit
      },
      quantity: item.quantity,
    }));
    const session = await this.stripe.checkout.sessions.create({
      // colocar id de la orden
      payment_intent_data: {
        metadata: {
          orderId,
        },
      },
      // colocar articulos de la orden
      line_items: lineItems,
      mode: 'payment',
      success_url: envs.stripeSuccessUrl,
      cancel_url: envs.stripeCancelUrl,
    });
    //return session;
    return {
      cancelUrl: session.cancel_url,
      succesUrl: session.success_url,
      url: session.url,
    };
  }

  stripeWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).send('Missing stripe-signature header');
    }
    let event: Stripe.Event;
    // Este es el edppoint local para pruebas con stripe
    // const endPointSecret =
    //   'whsec_1904164e0bdedd54f8e9aedc9567fc49d99c1f367b0d3543a3a236d13d3ab155';

    // Este es el endpoint en produccion
    const endPointSecret = envs.stripeEndpointSecret;

    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig,
        endPointSecret,
      );
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }
    switch (event.type) {
      case 'charge.succeeded':
        const chargeSucceded = event.data.object;
        const payload = {
          stripePaymentId: chargeSucceded.id,
          orderId: chargeSucceded.metadata.orderId,
          receiptUrl: chargeSucceded.receipt_url,
        };

        // this.logger.log(`Charge succeeded: ${JSON.stringify(payload)}`);
        this.natsClient.emit('payment.succeeded', payload);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
        break;
    }

    return res.status(200).json({ sig });
  }
  // Add your payment service methods here
}
