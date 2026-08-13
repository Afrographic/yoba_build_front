const express = require("express");
const router = express.Router();
const { Security } = require("../utils/security");
const { Validator } = require("../utils/validator");
const { HelperFunction } = require("../utils/helper_function");
const { HelperFile } = require("../utils/helper_file.js");
const { OwnerShipChecker } = require("../utils/ownership_checker.js");
const { Consts } = require("../consts.js");
const { Thoth_DB } = require("../thoth_db");
const { serverError } = require("../utils/server_error.js");
const Axios_Private = require("../utils/axios");
const { Model_Helper } = require("../utils/model_helper.js");

// Add lib context
router.post("/lib_context", Security.authenticateToken, async (req, res) => {
  try {
    let user_id = req.body.user_data.user_id;
    let { lib_context_name, room_id, lib_context_parent_id } = req.body;

    let created_at = new Date();

    if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
      return res.sendStatus(401);
    }

    let fields_ok = Validator.validateFields(
      { lib_context_name, room_id, lib_context_parent_id },
      res,
    );
    if (!fields_ok) {
      return;
    }

    let context_lib;

    lib_context_name = HelperFunction.Ucase(lib_context_name);

    if (lib_context_parent_id == 0) {
      context_lib = await Thoth_DB.post_data(
        "insert into lib_context(lib_context_name,created_at,user_id,room_id) values(:lib_context_name,:created_at,:user_id,:room_id)",
        { lib_context_name, created_at, user_id, room_id },
      );
    } else {
      context_lib = await Thoth_DB.post_data(
        "insert into lib_context(lib_context_name,lib_context_parent_id,created_at,user_id,room_id) values(:lib_context_name,:lib_context_parent_id,:created_at,:user_id,:room_id)",
        {
          lib_context_name,
          lib_context_parent_id,
          created_at,
          user_id,
          room_id,
        },
      );
    }

    res.send({ lib_context_id: context_lib[0] });
  } catch (error) {
    serverError(error, res);
  }
});

// update lib context
router.patch(
  "/lib_context/:lib_context_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let lib_context_id = req.params.lib_context_id;
      let user_id = req.body.user_data.user_id;
      let room_id = req.params.room_id;
      let lib_context_name = req.body.lib_context_name ?? "";

      if (lib_context_name.trim().length == 0) return res.sendStatus(400);

      if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
        return res.sendStatus(401);
      }

      await Thoth_DB.update_data(
        "update lib_context set lib_context_name=:lib_context_name where lib_context_id=:lib_context_id",
        { lib_context_name, lib_context_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// delete lib context
router.delete(
  "/lib_context/:lib_context_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let lib_context_id = req.params.lib_context_id;
      let room_id = req.params.room_id;
      let user_id = req.body.user_data.user_id;

      if (!(await OwnerShipChecker.is_room_admin(room_id, user_id))) {
        return res.sendStatus(401);
      }

      await delete_lib_context_sub_context(
        room_id,
        lib_context_id,
        req.body.token,
      );
      await delete_lib_files(lib_context_id);
      await Thoth_DB.delete_data(
        "delete  from lib_context where lib_context_id =:lib_context_id",
        { lib_context_id },
      );

      res.sendStatus(200);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function delete_lib_files(lib_context_id) {
  let files = await Thoth_DB.get_data(
    "select lib_file_url from lib where lib_context_id = :lib_context_id",
    { lib_context_id },
  );
  for (const file of files) {
    HelperFile.delete_file_from_server(file.lib_file_url);
  }
}

async function delete_lib_context_sub_context(room_id, lib_context_id, token) {
  let lib_contexts = await Thoth_DB.get_data(
    "select lib_context_id from lib_context where lib_context_parent_id = :lib_context_id",
    { lib_context_id },
  );
  for (const lib_context of lib_contexts) {
    await Model_Helper.delete_lib_context(lib_context.lib_context_id);
  }
}

// get all the files of a lib_context
router.get(
  "/files/lib_context/:lib_context_id/room/:room_id/offset/:offset",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let lib_context_id = req.params.lib_context_id;
      let room_id = req.params.room_id;
      let user_id = req.body.user_data.user_id;
      let offset = parseInt(req.params.offset);
      let limit = 10;

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        return res.sendStatus(401);
      }

      let files = await Thoth_DB.get_data(
        "select user_avatar,user_fullname,lib.* from lib,user where lib.user_id = user.user_id and lib_context_id =:lib_context_id order by lib_id DESC limit :limit offset :offset ",
        { lib_context_id, offset, limit },
      );

      for (let i = 0; i <= files.length - 1; i++) {
        files[i].user_avatar = `${Consts.stream_url}${files[i].user_avatar}`;
        if (files[i].lib_file_url) {
          files[i].lib_file_url =
            `${Consts.stream_url}${files[i].lib_file_url}`;
        }
      }

      res.send(files);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// get all the sub folders of a lib_context
router.get(
  "/sub_folders/lib_context/:lib_context_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = req.params.room_id;
      let lib_context_id = req.params.lib_context_id;
      let user_id = req.body.user_data.user_id;

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        return res.sendStatus(401);
      }

      let sub_folders = await Thoth_DB.get_data(
        "select * from lib_context where lib_context_parent_id=:lib_context_id ",
        { lib_context_id },
      );

      sub_folders = await get_meta_data(sub_folders, room_id, req.body.token);

      res.send(sub_folders);
    } catch (error) {
      serverError(error, res);
    }
  },
);

router.get(
  "/sub_folders_2/lib_context/:lib_context_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = req.params.room_id;
      let lib_context_id = req.params.lib_context_id;
      let user_id = req.body.user_data.user_id;

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        return res.sendStatus(401);
      }

      let sub_folders = await Thoth_DB.get_data(
        "select * from lib_context where lib_context_parent_id=:lib_context_id ",
        { lib_context_id },
      );

      res.send(sub_folders);
    } catch (error) {
      serverError(error, res);
    }
  },
);

//  get all the root folders
router.get(
  "/root_folders/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let room_id = req.params.room_id;
      let user_id = req.body.user_data.user_id;

      if (!(await OwnerShipChecker.is_room_member(room_id, user_id))) {
        return res.sendStatus(401);
      }

      let folders = await Thoth_DB.get_data(
        "select * from lib_context where lib_context_parent_id is null and room_id =:room_id",
        { room_id },
      );

      folders = await get_meta_data(folders, room_id, req.body.token);

      res.send(folders);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function get_meta_data(folders, room_id, token) {
  for (const folder of folders) {
    let index = folders.indexOf(folder);
    let total = await Thoth_DB.get_data(
      `select count(*) as total from lib where lib_context_id = ${folder.lib_context_id}`,
    );

    let parent_total = parseInt(total[0].total);
    folders[index].root_total_files = parent_total;

    // get all the children folders
    let res = await Model_Helper.get_children_of_subcontext(
      folder.lib_context_id,
    );

    for (const item of res) {
      let item_total = await get_total_files(item.lib_context_id);
      parent_total += item_total;
    }

    folders[index].total_files = parent_total;
  }
  return folders;
}

async function get_total_files(lib_context_id) {
  let total = await Thoth_DB.get_data(
    `select count(*) as total from lib where lib_context_id = ${lib_context_id}`,
  );
  return parseInt(total[0].total);
}

// get all the context of a root context
router.get(
  "/all_contexts/lib_context/:lib_context_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let contexts = [];
      let lib_context_id = req.params.lib_context_id;
      let room_id = req.params.room_id;
      async function get_sub_contexts(lib_context_id) {
        let child_contexts =
          await Model_Helper.get_sub_context_2(lib_context_id);
        for (const lib_context_item of child_contexts) {
          await get_sub_contexts(lib_context_item.lib_context_id);
        }
        if (child_contexts.length > 0) {
          contexts = contexts.concat(child_contexts);
        }
      }
      await get_sub_contexts(lib_context_id);
      res.send(contexts);
    } catch (error) {
      serverError(error, res);
    }
  },
);

// Get context tree of a course
router.get(
  "/tree/lib_context/:lib_context_id/room/:room_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let contexts = [];
      let lib_context_id = req.params.lib_context_id;
      let room_id = req.params.room_id;

      let context_item = await get_context_item(lib_context_id);
      contexts.push(context_item);
      while (context_item.lib_context_parent_id != null) {
        let parent_context = await get_context_item(
          context_item.lib_context_parent_id,
        );
        contexts.unshift(parent_context);
        context_item = parent_context;
      }

      contexts = await get_meta_data(contexts, room_id, req.body.token);
      res.send(contexts);
    } catch (error) {
      serverError(error, res);
    }
  },
);

async function get_context_item(context_id) {
  let context = await Thoth_DB.get_data(
    "SELECT * FROM lib_context where lib_context_id=:context_id",
    { context_id },
  );
  return context[0];
}

// TOp level total files
router.get(
  "/top_level_total_files/:lib_context_id",
  Security.authenticateToken,
  async (req, res) => {
    try {
      let lib_context_id = req.params.lib_context_id;
      let total = await Thoth_DB.get_data(
        "select count(*) as total from lib where lib_context_id=:lib_context_id",
        { lib_context_id },
      );
      res.send({ total: parseInt(total[0].total) });
    } catch (error) {
      serverError(error, res);
    }
  },
);

module.exports = router;
