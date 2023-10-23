const Sequelize = require('sequelize');
const { sequelize } = require('.');

class Schedule extends Sequelize.Model {
    static initiate(sequelize) {
        Schedule.init({
            jobId: {
                type: Sequelize.STRING,
                primaryKey: true,
            },
            endAt: Sequelize.DATE,

        }, {
            sequelize,
            modelName: 'Schedule',
        });
    }
};
module.exports = Schedule;