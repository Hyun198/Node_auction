const { scheduleJob } = require("node-schedule");
const { Op } = require("Sequelize");
const { Good, Auction, User, sequelize } = require("./models");

module.exports = async () => {
  console.log("checkAuction");
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targets = await Good.findAll({
      where: {
        SoldId: null,
        createdAt: { [Op.lte]: yesterday }, //yesterday 보다 작은
      },
    });
    targets.forEach(async (good) => {
      const success = await Auction.findOne({
        where: { GoodId: good.id },
        order: [["bid", "DESC"]],
      });
      await good.setSold(success.UserId);
      await User.update(
        {
          money: sequelize.literal(`money - ${success.bid}`),
        },
        {
          where: { id: success.UserId },
        }
      );
    });
    const ongoing = await Good.findAll({
      where: {
        SoldId: null,
        createdAt: { [Op.gte]: yesterday },
      },
    });
    ongoing.forEach((good) => {
      const end = new Date(good.createdAt);
      end.setDate(end.getDate() + 1);
      const job = scheduleJob(end, async () => {
        const success = await Auction.findOne({
          where: { GoodId: good.id },
          order: [["bid", "DESC"]],
        });
        await good.setSold(success.UserId);
        await User.update(
          {
            moeny: sequelize.literal(`money - ${success.bid}`),
          },
          {
            where: { id: success.UserId },
          }
        );
      });
      job.on("error", (err) => {
        console.error("스케줄링 에러", err);
      });
      job.on("success", () => {
        console.log("스케줄링 성공");
      });
    });
  } catch (err) {
    console.error(err);
  }
};
