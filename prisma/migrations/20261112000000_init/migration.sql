-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "github_handle" TEXT,
    "display_name" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "homepage" TEXT,
    "default_branch" TEXT NOT NULL,
    "primary_language" TEXT,
    "license_key" TEXT,
    "license_name" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_fork" BOOLEAN NOT NULL DEFAULT false,
    "github_created_at" TIMESTAMP(3),
    "github_updated_at" TIMESTAMP(3),
    "github_pushed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_analyses" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "user_id" TEXT,
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stars_count" INTEGER NOT NULL,
    "forks_count" INTEGER NOT NULL,
    "open_issues_count" INTEGER NOT NULL,
    "watchers_count" INTEGER NOT NULL,
    "open_pull_requests_count" INTEGER,
    "merged_pull_requests_count" INTEGER,
    "contributors_count" INTEGER,
    "recent_commits_count" INTEGER,
    "releases_count" INTEGER,
    "latest_release_tag" TEXT,
    "latest_release_at" TIMESTAMP(3),
    "has_readme" BOOLEAN NOT NULL,
    "readme_length" INTEGER,
    "has_contributing" BOOLEAN NOT NULL,
    "has_code_of_conduct" BOOLEAN NOT NULL,
    "has_tests" BOOLEAN NOT NULL,
    "has_ci_cd" BOOLEAN NOT NULL,
    "has_package_manifest" BOOLEAN NOT NULL,
    "languages_json" JSONB NOT NULL,
    "commit_activity_json" JSONB,
    "contributors_json" JSONB,
    "recent_commits_json" JSONB,
    "releases_json" JSONB,
    "data_quality_notes_json" JSONB NOT NULL,
    "methodology_version" TEXT NOT NULL DEFAULT '1.0.0',

    CONSTRAINT "repository_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_scores" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "documentation_score" INTEGER NOT NULL,
    "license_score" INTEGER NOT NULL,
    "testing_score" INTEGER NOT NULL,
    "cicd_score" INTEGER NOT NULL,
    "maintenance_score" INTEGER NOT NULL,
    "organization_score" INTEGER NOT NULL,
    "contribution_score" INTEGER NOT NULL,
    "release_score" INTEGER NOT NULL,
    "breakdown_json" JSONB NOT NULL,
    "disclaimer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "what_is_missing" TEXT NOT NULL,
    "why_it_matters" TEXT NOT NULL,
    "how_to_improve" TEXT NOT NULL,
    "potential_gain" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_comparisons" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repository_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_comparison_items" (
    "id" TEXT NOT NULL,
    "comparison_id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "repository_comparison_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "repository_id" TEXT,
    "analysis_id" TEXT,
    "comparison_id" TEXT,
    "user_id" TEXT,
    "payload_json" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_github_handle_key" ON "users"("github_handle");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_full_name_key" ON "repositories"("full_name");

-- CreateIndex
CREATE INDEX "repositories_primary_language_idx" ON "repositories"("primary_language");

-- CreateIndex
CREATE INDEX "repositories_updated_at_idx" ON "repositories"("updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "repositories_owner_name_key" ON "repositories"("owner", "name");

-- CreateIndex
CREATE INDEX "repository_analyses_repository_id_analyzed_at_idx" ON "repository_analyses"("repository_id", "analyzed_at" DESC);

-- CreateIndex
CREATE INDEX "repository_analyses_analyzed_at_idx" ON "repository_analyses"("analyzed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "health_scores_analysis_id_key" ON "health_scores"("analysis_id");

-- CreateIndex
CREATE INDEX "health_scores_overall_score_idx" ON "health_scores"("overall_score");

-- CreateIndex
CREATE INDEX "recommendations_analysis_id_severity_idx" ON "recommendations"("analysis_id", "severity");

-- CreateIndex
CREATE INDEX "repository_comparisons_created_at_idx" ON "repository_comparisons"("created_at" DESC);

-- CreateIndex
CREATE INDEX "repository_comparison_items_comparison_id_position_idx" ON "repository_comparison_items"("comparison_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "repository_comparison_items_comparison_id_repository_id_key" ON "repository_comparison_items"("comparison_id", "repository_id");

-- CreateIndex
CREATE INDEX "reports_generated_at_idx" ON "reports"("generated_at" DESC);

-- CreateIndex
CREATE INDEX "reports_report_type_idx" ON "reports"("report_type");

-- AddForeignKey
ALTER TABLE "repository_analyses" ADD CONSTRAINT "repository_analyses_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_analyses" ADD CONSTRAINT "repository_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_scores" ADD CONSTRAINT "health_scores_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "repository_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "repository_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_comparisons" ADD CONSTRAINT "repository_comparisons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_comparison_items" ADD CONSTRAINT "repository_comparison_items_comparison_id_fkey" FOREIGN KEY ("comparison_id") REFERENCES "repository_comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_comparison_items" ADD CONSTRAINT "repository_comparison_items_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_comparison_items" ADD CONSTRAINT "repository_comparison_items_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "repository_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "repository_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_comparison_id_fkey" FOREIGN KEY ("comparison_id") REFERENCES "repository_comparisons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
