USE [TaskSyncEnterprise]
GO
/****** Object:  Table [dbo].[alembic_version]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[alembic_version](
	[version_num] [varchar](32) NOT NULL,
 CONSTRAINT [alembic_version_pkc] PRIMARY KEY CLUSTERED 
(
	[version_num] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[audit_logs]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[audit_logs](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[employee_id] [int] NOT NULL,
	[employee_email] [nvarchar](255) NULL,
	[action] [nvarchar](50) NOT NULL,
	[timestamp] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[departments]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[departments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[department_code] [varchar](30) NOT NULL,
	[name] [varchar](100) NOT NULL,
	[description] [varchar](max) NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[department_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[employees]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[employees](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[employee_code] [varchar](30) NOT NULL,
	[full_name] [varchar](150) NOT NULL,
	[email] [varchar](255) NOT NULL,
	[phone] [varchar](max) NULL,
	[gender] [varchar](max) NULL,
	[address] [varchar](max) NULL,
	[date_of_birth] [date] NULL,
	[start_date] [date] NULL,
	[password_hash] [varchar](max) NOT NULL,
	[avatar_url] [varchar](max) NULL,
	[department_id] [int] NULL,
	[team_id] [int] NULL,
	[role_id] [int] NOT NULL,
	[manager_id] [int] NULL,
	[job_title] [varchar](max) NULL,
	[is_active] [bit] NOT NULL,
	[is_deleted] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NULL,
	[is_first_login] [bit] NOT NULL,
	[login_count] [int] NOT NULL,
	[last_login] [datetime] NULL,
	[last_logout] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[employee_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[project_members]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[project_members](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[project_id] [int] NOT NULL,
	[employee_id] [int] NOT NULL,
	[joined_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[projects]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[projects](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[project_code] [varchar](30) NOT NULL,
	[name] [varchar](200) NOT NULL,
	[description] [varchar](max) NULL,
	[start_date] [date] NULL,
	[end_date] [date] NULL,
	[status] [varchar](30) NOT NULL,
	[priority] [varchar](20) NOT NULL,
	[budget] [numeric](18, 2) NULL,
	[progress_percent] [numeric](5, 2) NOT NULL,
	[created_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
	[updated_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[project_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[refresh_tokens]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[refresh_tokens](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[employee_id] [int] NOT NULL,
	[token] [varchar](500) NOT NULL,
	[expires_at] [datetime] NOT NULL,
	[is_revoked] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[roles]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[roles](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[role_name] [varchar](50) NOT NULL,
	[description] [varchar](255) NULL,
	[is_system] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[role_name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[task_assignments]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[task_assignments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[task_id] [int] NOT NULL,
	[employee_id] [int] NOT NULL,
	[assigned_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[task_checklists]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[task_checklists](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[task_id] [int] NOT NULL,
	[title] [varchar](max) NOT NULL,
	[is_completed] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[task_comments]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[task_comments](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[task_id] [int] NULL,
	[employee_id] [int] NULL,
	[content] [varchar](max) NOT NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tasks]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tasks](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[project_id] [int] NOT NULL,
	[title] [varchar](200) NOT NULL,
	[description] [varchar](max) NULL,
	[priority] [varchar](20) NOT NULL,
	[status] [varchar](30) NOT NULL,
	[story_points] [int] NOT NULL,
	[progress_percent] [numeric](5, 2) NOT NULL,
	[deadline] [datetime] NULL,
	[created_by] [int] NULL,
	[is_deleted] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[teams]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[teams](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[department_id] [int] NOT NULL,
	[team_code] [varchar](30) NOT NULL,
	[name] [varchar](100) NOT NULL,
	[description] [varchar](max) NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[team_code] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[token_blacklist]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[token_blacklist](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[token] [varchar](500) NOT NULL,
	[token_type] [varchar](50) NOT NULL,
	[expired_at] [datetime] NOT NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[user_sessions]    Script Date: 6/25/2026 1:35:10 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[user_sessions](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[employee_id] [int] NOT NULL,
	[access_token] [varchar](500) NOT NULL,
	[refresh_token] [varchar](500) NOT NULL,
	[ip_address] [varchar](50) NULL,
	[user_agent] [varchar](255) NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[audit_logs] ADD  DEFAULT (getdate()) FOR [timestamp]
GO
ALTER TABLE [dbo].[departments] ADD  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[departments] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[employees] ADD  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[employees] ADD  DEFAULT ((0)) FOR [is_deleted]
GO
ALTER TABLE [dbo].[employees] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[employees] ADD  DEFAULT ((1)) FOR [is_first_login]
GO
ALTER TABLE [dbo].[employees] ADD  DEFAULT ((0)) FOR [login_count]
GO
ALTER TABLE [dbo].[project_members] ADD  DEFAULT (getdate()) FOR [joined_at]
GO
ALTER TABLE [dbo].[projects] ADD  DEFAULT ('Planning') FOR [status]
GO
ALTER TABLE [dbo].[projects] ADD  DEFAULT ('Medium') FOR [priority]
GO
ALTER TABLE [dbo].[projects] ADD  DEFAULT ((0)) FOR [progress_percent]
GO
ALTER TABLE [dbo].[projects] ADD  DEFAULT ((0)) FOR [is_deleted]
GO
ALTER TABLE [dbo].[projects] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[refresh_tokens] ADD  DEFAULT ((0)) FOR [is_revoked]
GO
ALTER TABLE [dbo].[refresh_tokens] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[roles] ADD  DEFAULT ((0)) FOR [is_system]
GO
ALTER TABLE [dbo].[roles] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[task_assignments] ADD  DEFAULT (getdate()) FOR [assigned_at]
GO
ALTER TABLE [dbo].[task_checklists] ADD  DEFAULT ((0)) FOR [is_completed]
GO
ALTER TABLE [dbo].[task_comments] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[tasks] ADD  DEFAULT ('Medium') FOR [priority]
GO
ALTER TABLE [dbo].[tasks] ADD  DEFAULT ('To Do') FOR [status]
GO
ALTER TABLE [dbo].[tasks] ADD  DEFAULT ((0)) FOR [story_points]
GO
ALTER TABLE [dbo].[tasks] ADD  DEFAULT ((0)) FOR [progress_percent]
GO
ALTER TABLE [dbo].[tasks] ADD  DEFAULT ((0)) FOR [is_deleted]
GO
ALTER TABLE [dbo].[tasks] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[teams] ADD  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[teams] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[token_blacklist] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[user_sessions] ADD  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[user_sessions] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[employees]  WITH CHECK ADD FOREIGN KEY([department_id])
REFERENCES [dbo].[departments] ([id])
GO
ALTER TABLE [dbo].[employees]  WITH CHECK ADD FOREIGN KEY([manager_id])
REFERENCES [dbo].[employees] ([id])
GO
ALTER TABLE [dbo].[employees]  WITH CHECK ADD FOREIGN KEY([role_id])
REFERENCES [dbo].[roles] ([id])
GO
ALTER TABLE [dbo].[employees]  WITH CHECK ADD FOREIGN KEY([team_id])
REFERENCES [dbo].[teams] ([id])
GO
ALTER TABLE [dbo].[project_members]  WITH CHECK ADD FOREIGN KEY([employee_id])
REFERENCES [dbo].[employees] ([id])
GO
ALTER TABLE [dbo].[project_members]  WITH CHECK ADD FOREIGN KEY([project_id])
REFERENCES [dbo].[projects] ([id])
GO
ALTER TABLE [dbo].[projects]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[employees] ([id])
GO
ALTER TABLE [dbo].[refresh_tokens]  WITH CHECK ADD FOREIGN KEY([employee_id])
REFERENCES [dbo].[employees] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[task_assignments]  WITH CHECK ADD FOREIGN KEY([employee_id])
REFERENCES [dbo].[employees] ([id])
GO
ALTER TABLE [dbo].[task_assignments]  WITH CHECK ADD FOREIGN KEY([task_id])
REFERENCES [dbo].[tasks] ([id])
GO
ALTER TABLE [dbo].[task_checklists]  WITH CHECK ADD FOREIGN KEY([task_id])
REFERENCES [dbo].[tasks] ([id])
GO
ALTER TABLE [dbo].[task_comments]  WITH CHECK ADD FOREIGN KEY([employee_id])
REFERENCES [dbo].[employees] ([id])
GO
ALTER TABLE [dbo].[task_comments]  WITH CHECK ADD FOREIGN KEY([task_id])
REFERENCES [dbo].[tasks] ([id])
GO
ALTER TABLE [dbo].[tasks]  WITH CHECK ADD FOREIGN KEY([created_by])
REFERENCES [dbo].[employees] ([id])
GO
ALTER TABLE [dbo].[tasks]  WITH CHECK ADD FOREIGN KEY([project_id])
REFERENCES [dbo].[projects] ([id])
GO
ALTER TABLE [dbo].[teams]  WITH CHECK ADD FOREIGN KEY([department_id])
REFERENCES [dbo].[departments] ([id])
GO
ALTER TABLE [dbo].[user_sessions]  WITH CHECK ADD FOREIGN KEY([employee_id])
REFERENCES [dbo].[employees] ([id])
ON DELETE CASCADE
GO
