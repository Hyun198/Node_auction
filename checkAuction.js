const { scheduleJob } = require("node-schedule");
const { Op } = require("sequelize");
const { Good, Auction, User, sequelize,Schedule } = require("./models");


module.exports = async () => {
  console.log("checkAuction");
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // 어제 시간
    const targets = await Good.findAll({
      // 24시간이 지난 낙찰자 없는 경매들
      where: {
        SoldId: null,
        createdAt: { [Op.lte]: yesterday },
      },
    });

    //서버 시작시 저장된 스케줄 정보 조회 후 설정
    const storedSchedules = await Schedule.findAll();
    storedSchedules.forEach((storedSchedule) => {
      const job = scheduleJob(storedSchedule.jobId, async () => {
        //스케줄러 실행 시 작업 실행
        const t = await sequelize.transaction();
        try {
          await t.commit();

        } catch (error) {
          await t.rollback();
        }
      });
      job.on("error", (err) => {
        console.error("스케줄링 에러", err);
      });
      job.on("success", () => {
        console.log("스케줄링 성공");
      });
    });


    targets.forEach(async (good) => {
      const t = await sequelize.transaction();
      try {
        const success = await Auction.findOne({
          where: { GoodId: good.id },
          order: [["bid", "DESC"]],
          transaction: t,
        });
        await good.setSold(success.UserId, { transaction: t });
        await User.update(
          {
            money: sequelize.literal(`money - ${success.bid}`),
          },
          {
            where: { id: success.UserId },
            transaction: t,
          }
        );
        await t.commit();
      } catch (error) {
        await t.rollback();
      }
    });
    const ongoing = await Good.findAll({
      // 24시간이 지나지 않은 낙찰자 없는 경매들
      where: {
        SoldId: null,
        createdAt: { [Op.gte]: yesterday },
      },
    });
    ongoing.forEach((good) => {
      const end = new Date(good.createdAt);
      end.setDate(end.getDate() + 1); // 생성일 24시간 뒤가 낙찰 시간
      const job = scheduleJob(end, async () => {
        const t = await sequelize.transaction();
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
      job.on("error", (err) => {
        console.error("스케줄링 에러", err);
      });
      job.on("success", () => {
        console.log("스케줄링 성공");
      });
    });
  } catch (error) {
    console.error(error);
  }
};
