const Order = require('../../../models/order');

function statusController() {
    return {
        async update(req, res) {
            try {
                const order = await Order.updateOne(
                    { _id: req.body.orderId },
                    { status: req.body.status }
                );

                if (order.nModified === 0) {
                    return res.redirect('/admin/orders');
                }

                // Emit event
                const eventEmitter = req.app.get('eventEmitter');
                eventEmitter.emit('orderUpdated', { id: req.body.orderId, status: req.body.status });

                return res.redirect('/admin/orders');
            } catch (error) {
                console.error(error);
                return res.redirect('/admin/orders'); // You can handle the error as needed
            }
        },
    };
}

module.exports = statusController;