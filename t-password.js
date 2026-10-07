[1mdiff --git a/vercel.json b/vercel.json[m
[1mnew file mode 100644[m
[1mindex 0000000..a879ffa[m
[1m--- /dev/null[m
[1m+++ b/vercel.json[m
[36m@@ -0,0 +1,9 @@[m
[32m+[m[32m{[m
[32m+[m[32m  "buildCommand": "npx prisma db push && npx prisma generate && next build",[m
[32m+[m[32m  "crons": [[m
[32m+[m[32m    {[m
[32m+[m[32m      "path": "/api/reminders",[m
[32m+[m[32m      "schedule": "0 13 * * *"[m
[32m+[m[32m    }[m
[32m+[m[32m  ][m
[32m+[m[32m}[m
\ No newline at end of file[m
