const Order = require('../../../models/order');
const moment = require('moment');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

function orderController() {
    return {
        async store(req, res) {
            // Validate request
            const { phone, address, stripeToken, paymentType } = req.body;
            if (!phone || !address) {
                return res.status(422).json({ message: 'All fields are required' });
            }

            try {
                const order = new Order({
                    customerId: req.user._id,
                    items: req.session.cart.items,
                    phone,
                    address,
                });

                const result = await order.save();
                const placedOrder = await Order.populate(result, { path: 'customerId' });

                // Stripe payment
                if (paymentType === 'card') {
                    try {
                        await stripe.charges.create({
                            amount: req.session.cart.totalPrice * 100,
                            source: stripeToken,
                            currency: 'inr',
                            description: `Pizza order: ${placedOrder._id}`,
                        });

                        placedOrder.paymentStatus = true;
                        placedOrder.paymentType = paymentType;
                        const ord = await placedOrder.save();

                        // Emit
                        const eventEmitter = req.app.get('eventEmitter');
                        eventEmitter.emit('orderPlaced', ord);

                        delete req.session.cart;
                        return res.json({ message: 'Payment successful, Order placed successfully' });
                    } catch (err) {
                        delete req.session.cart;
                        return res.json({ message: 'Order placed but payment failed. You can pay at delivery time' });
                    }
                } else {
                    delete req.session.cart;
                    return res.json({ message: 'Order placed successfully' });
                }
            } catch (err) {
                return res.status(500).json({ message: 'Something went wrong' });
            }
        },
        async index(req, res) {
            try {
                const orders = await Order.find(
                    { customerId: req.user._id },
                    null,
                    { sort: { 'createdAt': -1 } }
                );

                res.header('Cache-Control', 'no-store');
                res.render('customers/orders', { orders: orders, moment: moment });
            } catch (err) {
                return res.status(500).json({ message: 'Something went wrong' });
            }
        },
        async show(req, res) {
            try {
                const order = await Order.findById(req.params.id);

                // Authorize user
                if (req.user._id.toString() === order.customerId.toString()) {
                    return res.render('customers/singleOrder', { order });
                }
                return res.redirect('/');
            } catch (err) {
                return res.status(500).json({ message: 'Something went wrong' });
            }
        },
    };
}

module.exports = orderController;
