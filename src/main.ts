import core from '@actions/core';
import github from '@actions/github';

// When used, this requiredArgOptions will error if a value has not been provided.
const requiredArgOptions = {
  required: true,
  trimWhitespace: true,
};

const token = core.getInput('github-token', requiredArgOptions);
const octokit = github.getOctokit(token);
const { repo: contextRepo, payload: githubPaylod } = github.context;
const { pull_request: pullRequest } = githubPaylod;
const { owner, repo } = contextRepo;
const inputPrRef = core.getInput('pr-ref', { required: false, trimWhitespace: true });
const inputPrNum = core.getInput('pr-number', { required: false, trimWhitespace: true });
const prNumber = parseInt(inputPrNum, 10) || pullRequest?.number || 0;

const commentId = core.getInput('comment-identifier', requiredArgOptions);
const commentContent = core.getInput('comment-content', requiredArgOptions);
const createIfNotExists = core.getBooleanInput('comment-content') || true;

const commentStart = '<!--';
const commentPackageName = 'im-open/update-pr-comment';
const commentEnd = '-->';
const markupPrefix = `${commentStart} ${commentPackageName} - ${commentId} ${commentEnd}`;

async function findExistingComment(prNum: number) {
  if (!prNum) return;

  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNum,
  });

  if (!comments.length) {
    core.info(
      `An existing comment for ${commentId} was not found on PR #${prNum}, will create a new one instead.`,
    );

    return null;
  }

  const existingComment = comments.find((c) => c.body?.startsWith(markupPrefix));
  if (existingComment) {
    core.info(
      `An existing comment (${existingComment.id}) for ${commentId} was found on PR #${prNum} and will be updated.`,
    );

    return existingComment.id;
  }
}

async function updateComment(body: string, existingCommentId: number) {
  const requestParams = {
    owner,
    repo,
    body,
    comment_id: existingCommentId,
  };

  return octokit.rest.issues.updateComment(requestParams);
}

async function createComment(body: string, prNum: number) {
  const requestParams = {
    owner,
    repo,
    body,
    issue_number: prNum,
  };

  return octokit.rest.issues.createComment(requestParams);
}

async function createOrUpdateComment(prNums: number[]) {
  if (!prNums.length) return;

  try {
    prNums.forEach(async (prNum) => {
      core.info('Checking for existing comment on PR....');
      const existingCommentId = await findExistingComment(prNum);

      if (!createIfNotExists && !existingCommentId) {
        core.info('Comment does not exist and will not be created');
        return;
      }

      const body = `${markupPrefix}\n${commentContent}`;
      const successStatus = existingCommentId ? 200 : 201;
      const infoMessage = existingCommentId
        ? `Updating existing PR #${existingCommentId} comment...`
        : 'Creating a new PR comment...';
      const action = existingCommentId ? 'update' : 'create';

      core.info(infoMessage);

      const {
        status,
        data: { id: updatedCommentId },
      } = existingCommentId
        ? await updateComment(body, existingCommentId as number)
        : await createComment(body, prNum);

      if (status === successStatus) {
        core.info(`PR comment was ${action}d.  ID: ${updatedCommentId}.`);
      } else {
        core.setFailed(`Failed to ${action} PR comment. Error code: ${status}.`);
      }
    });
  } catch (error) {
    core.setFailed(
      `An error occurred trying to create or update the PR comment: ${(error as Error).message}`,
    );
  }
}

async function findPrs() {
  const prs = await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
    q: `${inputPrRef}+repo:${owner}/${repo}+type:pr`,
  });
  return prs.map((pr) => pr.number);
}

async function run() {
  // repo:im-client/frontend-tooling-bff+type:pr+maxversions-2023-01-31-1675192218
  let prNums = prNumber ? [prNumber] : null;
  if (!prNums) {
    if (!inputPrRef) {
      core.info(
        'This event was not triggered by a pull_request, and no ref or PR number was supplied.  No comment will be created or updated.',
      );
      return;
    }

    prNums = await findPrs();
    if (!prNums.length) {
      core.info(
        `No PRs were found for the ref ${inputPrRef}.  No comment will be created or updated.`,
      );
      return;
    }
  }

  try {
    await createOrUpdateComment(prNums);
  } catch (error) {
    core.setFailed(`An error occurred processing the summary file: ${(error as Error).message}`);
  }
}

run();
