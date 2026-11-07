# iMessage 本地合同

Node 22.13+；macOS Messages和用户授予的Full Disk Access/Automation。设置IMESSAGE_DB_PATH为授权chat.db绝对路径；COTREE_IMESSAGE_ALLOWED_CHATS为精确iMessage会话GUID字符串JSON数组。不自动采用个人主目录数据库，不读取旧.claude权限文件。

node scripts/imessage.mjs history request.json / plan-send request.json / send request.json。history请求{"chat_id":"iMessage;-;observed-handle","limit":30,"after_rowid":0}；send请求同chat_id与text，或单个file绝对路径。plan-send不运行AppleScript。实际send通过/usr/bin/osascript stdin固定脚本和argv，15秒取消/超时；没有私有API、SIP修改、tapback、编辑或线程伪实现。

直接读取SQLite仅作有界历史/后续消息检索，不运行数据库写入和常驻模型循环；恢复使用实际游标。来源README、ACCESS、configure/access技能、完整server.ts及attributedBody解码参考均在resources/source-01/content。Windows测试只能证明语法、合成数据库和参数隔离；真实macOS数据库schema、媒体、TCC和消息提交另验。
