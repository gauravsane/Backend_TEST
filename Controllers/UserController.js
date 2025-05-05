const UserModel = require("../Models/UsersModel");
const TrackRequest = require("../Models/TrackRequest");
const exec1 = require("util").promisify(require("child_process").exec);
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const axios = require("axios");

let isProcessing = false;
let queue = [];
const maxProcessingLimit = 2;


const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN;

const getIdKidney = async () => {
  if (isProcessing) {
    console.log("Skipping execution: Process is already running.");
    return;
  }

  isProcessing = true;

  try {
    const requests = await TrackRequest.find();

    if (requests.length === 0) {
      console.log("No request found in trackReq");
      return;
    }

    let queueIds = [];

    for (const request of requests) {
      if (Array.isArray(request.ids)) {
        for (const idObj of request.ids) {
          if (!idObj.status && queue.length < maxProcessingLimit) {
            const locked = await TrackRequest.findOneAndUpdate(
              {
                _id: request._id,
                "ids._id": idObj._id,
                "ids.status": false,
              },
              {
                $set: { "ids.$.status": true },
              },
              { returnDocument: "after" }
            );
            if (locked) {
              queue.push(idObj._id);
              queueIds.push({ docId: request._id, id: idObj._id });
              console.log("ID locked & pushed:", idObj._id);
            }
          }
        }
      }
    }

    if (queueIds.length > 0) {
      console.log("Queue IDs before deletion:", queueIds);

      // Remove each locked id from its respective document
      for (const item of queueIds) {
        await TrackRequest.updateOne(
          { _id: item.docId },
          { $pull: { ids: { _id: item.id } } }
        );
      }

      // Process
      await processQueue(queueIds.map((item) => item.id));
      queue = [];
    } else {
      console.log("No valid IDs found, skipping deletion.");
    }
  } catch (error) {
    console.error("Error fetching trackReq:", error);
  } finally {
    isProcessing = false;
  }
};
cron.schedule("*/5 * * * * *", async () => {
  await getIdKidney();
});

const processQueue = async (queueIds) => {
  try {
    const UserDetails = await UserModel.find({
      _id: { $in: queueIds },
    });

    if (UserDetails.length === 0) {
      console.log("No User details found in Database.");
      return;
    }

    await processMotherDayVideo(UserDetails);
    await uploadAndUpdate();
    console.log("Video processing completed, ready to upload and update.");
  } catch (error) {
    console.error("Error processing queue:", error);

    await Promise.all(
      queueIds.map(async (id) => {
        await Fso.updateOne(
          { "cardCategories._id": id },
          {
            $set: {
              "cardCategories.$.Status": "Failed",
            },
          }
        );
      })
    );

    try {
      const card = await Fso.findOne({ "cardCategories._id": queueIds[0] });

      if (card) {
        const doctorName = card.cardCategories
          .find((c) => c._id.toString() === queueIds[0].toString())
          ?.fileName.split("_")[0];
        const email = card.email;

        if (email) {
          await mailSender(
            email,
            `Oops! Something went wrong`,
            `<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <img src="https://digilateral.com/images/digilogo.png" alt="Company Logo">
                            </div>
                            <div style="font-family: Arial, sans-serif; color: #333; text-align:center; border: 1px solid black;">
                                <h1 style="color: white; background-color: #ff6600; padding: 7px; font-size: 20px;">
                                    Oops !!! <br/>
                                    Something Went Wrong
                                </h1>
                                <p style="font-size: 16px;">
                                    We encountered an error while processing your request.
                                    You can try creating the video again for <br/><br/>
                                    <span style="font-size: 25px;">${doctorName}</span>
                                </p>
                                <div style="margin-top: 20px;"></div>
                            </div>
                        </div>
                    </body>
                    </html>`
          );

          console.log(`Failure email sent to ${email}`);
        } else {
          console.error("No email found for failed card.");
        }
      } else {
        console.error("No card found for the given queueId.");
      }
    } catch (emailError) {
      console.error("Failed to send failure email:", emailError);
    }
  }
};

let startTime;
const processMotherDayVideo = async (UserDetails) => {
  try {
    startTime = new Date();
    let Email = "dummy@digilateral.com";
    // const runScriptPath = path.join(__dirname, "../run_python.sh");
    const uploadDir = path.join(__dirname, "uploads");
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const processingTasks = UserDetails.map(async (UserData) => {
      try {
        const uniqueId = uuidv4();
        const pythonScriptPath = path.join(__dirname, "../mother.py");
        const outputPath = path.join(
          "uploads",
          `${UserData.Name}_${UserData.MotherName}_${uniqueId}.mp4`
        );

        let pcommand = `python ${pythonScriptPath} --name "${UserData.MotherName}" --output "${outputPath}"`;

        await exec1(pcommand);
      } catch (error) {
        console.error(`Error processing video for ${UserData}:`, error);
      }
    });

    await Promise.all(processingTasks);
    console.log("All videos processed successfully.");
  } catch (error) {
    console.error("Error setting up video processing:", error);
  }
};

const uploadAndUpdate = async () => {
  try {
    const uploadDir = path.join(__dirname, "../uploads");
    const files = fs.readdirSync(uploadDir);

    for (const file of files) {
      const filePath = path.join(uploadDir, file);

      const { data: presignedData } = await axios.post(
        "https://somprazquiz.digilateral.com/getPresignedUrlvd",
        { fileName: file, fileType: "video/mp4" }
      );

      const { uploadUrl, key } = presignedData;

      if (!uploadUrl || !key) {
        console.error(`Failed to get presigned URL for ${file}`);
        continue;
      }

      console.log("Uploading", file);

      const fileStream = fs.readFileSync(filePath);
      await axios.put(uploadUrl, fileStream, {
        headers: { "Content-Type": "video/mp4" },
      });

      console.log(`Successfully uploaded ${file} to S3`);

      if (fs.existsSync(filePath)) {
        const fileStats = fs.statSync(filePath);
        const fileSizeInMB = (fileStats.size / (1024 * 1024)).toFixed(2);
        const endTime = new Date();
        const processingTime = (endTime - startTime) / 1000;
        const timeCompleted = endTime.toTimeString().split(" ")[0];
      }

      fs.unlinkSync(filePath);
      console.log(`Deleted local file: ${filePath}`);
    }
  } catch (error) {
    console.error("Error uploading processed videos:", error);
  }
};

const sendMessage = async () => {
  try {
    const response = await axios({
      url: "https://graph.facebook.com/v22.0/674013022456577/messages",
      method: "post",
      headers: {
        Authorization: `Bearer EAA2ZCURKlOI4BO2XMzZAnvRpQny5z7jr2JZAJlFY0K3v61QBD5IRePqFJxizzXbEtZA8ySUWaTH2pjJmLuH5GkLqKtSmhWngqZCTcEIms0tjGPABL9jO1sdW0vwYeZCMnqxDTgHsZCoPy2mRoSDxYuL25ej24K4NV8GZA7Jo0a73qksWeQCZCMOVsSZARjh5ghOu9MymBQ1lksuB8NCZCgPsuNnt83XhNPnMZCQLBc4VPBoTFD92KvPArCYZD`,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        // messaging_product: "whatsapp",
        // to: "+918928008219",
        // type: "image",
        // image: {
        //  link: 'https://media.gettyimages.com/id/166080748/vector/cricket-player-strikes-the-ball-for-six.jpg?s=612x612&w=gi&k=20&c=V-kwBs62Vum3JsjZTDYTsXeyvA1Q0-ECKwuq8m39hTg=',
        //  caption: "Media Message"
        // },
        messaging_product: "whatsapp",
        to: "918928008219",
        type: "template",
        template: {
          name: "hello_world",
          language: {
            code: "en_US",
          },
        },
      }),
    });
    console.log("Response", response.data);
  } catch (error) {
    console.error("Error sending message:", error);
  }
};
// sendMessage();

const getAllWebhooks = async (req, res) => {
  console.log(req.query);
    let mode = req.query["hub.mode"];
    let challenge = req.query["hub.challenge"];
    let token = req.query["hub.verify_token"];

    if(mode && token === mytoken){
      res.status(200).send(challenge)
    }
    else{
      res.sendStatus(403)
    }
};

const webHooksToSendMessages = async (req, res) => {
    console.log(JSON.stringify(req.body.stringify(body_params, null, 2)));
    res.status(200).send('Webhook processed')
    // if (
    //   body_params.entry[0] &&
    //   body_params.entry[0].changes &&
    //   body_params.entry[0].value.message &&
    //   body_params.entry[0].value.message[0]
    // ) {
    //   let phone_no_id =
    //     body_params.entry[0].changes[0].vlaue.metadata.phone_number_id;
    //   let from = body_params.entry[0].changes[0].value.messages.from;
    //   let msg_body = body_params.entry[0].changes[0].value.message[0].text.body;

    //   axios({
    //     method: "POST",
    //     url:
    //       "https://graph.facebook.com/v22.0/" +
    //       phone_no_id +
    //       "/messages?access_token=" +
    //       token,
    //     data: {
    //       messaging_product: "whatsapp",
    //       to: from,
    //       text: {
    //         body: "Hii...I'm Gaurav",
    //       },
    //     },
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //   });
    //   return res.status(200).json({
    //     success: true,
    //     messsage: "Success",
    //   });
    // }
    // else{
    //   return res.status(500).json({
    //     success: false,
    //     message: "Internal Server Error",
    //   });
    // }
};

module.exports = {
  getIdKidney,
  getAllWebhooks,
  webHooksToSendMessages,
};
