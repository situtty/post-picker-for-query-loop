/**
 * WordPress dependencies
 */
import { __ } from "@wordpress/i18n";
import { addFilter } from "@wordpress/hooks";
import { createHigherOrderComponent } from "@wordpress/compose";
import { InspectorControls } from "@wordpress/block-editor";
import {
  FormTokenField,
  Notice,
  PanelBody,
  // @ts-ignore
  __experimentalVStack as VStack,
} from "@wordpress/components";
import { useSelect } from "@wordpress/data";
// @ts-ignore
import { store as coreStore } from "@wordpress/core-data";
import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "@wordpress/element";
// @ts-ignore
import apiFetch from "@wordpress/api-fetch";
// @ts-ignore
import { addQueryArgs } from "@wordpress/url";

/**
 * Internal dependencies
 */
import "./editor.scss";

/**
 * Constants
 */
const POSTS_PER_PAGE = 100;
const TEXT_DOMAIN = "cherry-pick-for-query-loop";

/**
 * Types
 */
interface TaxQuery {
  [taxonomy: string]: number[];
}

interface QueryAttributes {
  postType?: string;
  include?: number[];
  inherit?: boolean;
  parents?: number[];
  search?: string;
  author?: string;
  taxQuery?: TaxQuery;
  [key: string]: unknown;
}

interface BlockAttributes {
  query: QueryAttributes;
  [key: string]: unknown;
}

interface PostPickerPanelProps {
  attributes: BlockAttributes;
  setAttributes: (attrs: Partial<BlockAttributes>) => void;
}

interface Post {
  id: number;
  type: string;
  status: string;
  title: {
    rendered?: string;
    raw?: string;
  };
}

/**
 * Get post title with fallback
 */
function getPostTitle(post: Post): string {
  return (
    post.title?.rendered || post.title?.raw || __("(Untitled)", TEXT_DOMAIN)
  );
}

/**
 * Format post for display
 */
function formatPostLabel(post: Post): string {
  const statusLabel = post.status !== "publish" ? ` [${post.status}]` : "";
  return `${getPostTitle(post)}${statusLabel} (ID: ${post.id})`;
}

/**
 * Extract post ID from token string
 */
function extractPostId(token: string): number | null {
  const match = token.match(/\(ID: (\d+)\)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get REST API endpoint for post type
 */
function getRestBase(postType: string): string {
  const mapping: Record<string, string> = {
    post: "posts",
    page: "pages",
  };
  return mapping[postType] || postType;
}

/**
 * Build query params from Query Loop filters
 */
function buildQueryParams(query: QueryAttributes): Record<string, unknown> {
  const params: Record<string, unknown> = {
    per_page: POSTS_PER_PAGE,
    orderby: "date",
    order: "desc",
    status: "publish,draft,pending,private,future",
    context: "edit",
  };

  // Parent filter (for hierarchical post types like pages)
  if (query.parents && query.parents.length > 0) {
    params.parent = query.parents.join(",");
  }

  // Search/keyword filter
  if (query.search) {
    params.search = query.search;
  }

  // Author filter
  if (query.author) {
    params.author = query.author;
  }

  // Taxonomy filters
  if (query.taxQuery) {
    Object.entries(query.taxQuery).forEach(([taxonomy, termIds]) => {
      if (termIds && termIds.length > 0) {
        // Map taxonomy names to REST API parameter names
        const paramName =
          taxonomy === "category"
            ? "categories"
            : taxonomy === "post_tag"
              ? "tags"
              : taxonomy;
        params[paramName] = termIds.join(",");
      }
    });
  }

  return params;
}

/**
 * Custom hook to fetch posts including drafts
 */
function usePosts(query: QueryAttributes, enabled: boolean) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const postType = query.postType || "post";

  // Create a stable key for the query filters (excluding include/orderBy)
  const queryKey = useMemo(() => {
    const { include, orderBy, ...filters } = query;
    return JSON.stringify(filters);
  }, [query]);

  useEffect(() => {
    if (!enabled) {
      setPosts([]);
      return;
    }

    setIsLoading(true);

    const params = buildQueryParams(query);
    const path = addQueryArgs(`/wp/v2/${getRestBase(postType)}`, params);

    apiFetch({ path })
      .then((result: Post[]) => {
        setPosts(result || []);
      })
      .catch(() => {
        setPosts([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [queryKey, postType, enabled]);

  return { posts, isLoading };
}

/**
 * PostPickerPanel component
 */
function PostPickerPanel({ attributes, setAttributes }: PostPickerPanelProps) {
  const { query } = attributes;
  const { postType = "post", include = [], inherit = false } = query;
  const prevPostTypeRef = useRef(postType);

  // Clear selection when post type changes
  useEffect(() => {
    if (prevPostTypeRef.current !== postType) {
      prevPostTypeRef.current = postType;
      if (include.length > 0) {
        const { include: _, orderBy: __, ...rest } = query;
        setAttributes({ query: rest });
      }
    }
  }, [postType]);

  // Ensure orderBy is "include" when posts are selected
  useEffect(() => {
    if (include.length > 0 && query.orderBy !== "include") {
      setAttributes({ query: { ...query, orderBy: "include" } });
    }
  }, [query.orderBy, include.length]);

  // Fetch posts with query filters applied
  const { posts } = usePosts(query, !inherit);

  // Fetch selected posts data
  const selectedPostsData = useSelect(
    (select) => {
      if (inherit || !include.length) {
        return [] as Post[];
      }

      const { getEntityRecord } = select(coreStore);
      return include
        .map(
          (id) =>
            getEntityRecord("postType", postType, id, {
              context: "edit",
            }) as Post | undefined
        )
        .filter((post): post is Post => Boolean(post));
    },
    [include, postType, inherit]
  );

  // Memoized computed values
  const selectedTitles = useMemo(
    () => selectedPostsData.map(formatPostLabel),
    [selectedPostsData]
  );

  const suggestions = useMemo(() => posts.map(formatPostLabel), [posts]);

  // Update query with new include array
  const updateInclude = useCallback(
    (ids: number[]) => {
      if (ids.length > 0) {
        setAttributes({
          query: {
            ...query,
            include: ids,
            orderBy: "include",
          },
        });
      } else {
        // Remove include and orderBy from query
        const { include: _include, orderBy: _orderBy, ...rest } = query;
        setAttributes({ query: rest });
      }
    },
    [query, setAttributes]
  );

  // Memoized event handlers
  const handleTokenChange = useCallback(
    (tokens: string[]) => {
      const ids = tokens
        .map(extractPostId)
        .filter((id): id is number => id !== null);
      updateInclude(ids);
    },
    [updateInclude]
  );

  if (inherit) {
    return null;
  }

  return (
    <PanelBody title={__("Pick Posts", TEXT_DOMAIN)} initialOpen>
      <VStack spacing={4}>
        <Notice status="warning" isDismissible={false}>
          {__(
            "Posts are displayed in the order you select. Sorting and sticky post settings are ignored.",
            TEXT_DOMAIN
          )}
        </Notice>

        <FormTokenField
          __next40pxDefaultSize
          __nextHasNoMarginBottom
          label={__("Search", TEXT_DOMAIN)}
          value={selectedTitles}
          suggestions={suggestions}
          onChange={handleTokenChange}
          __experimentalShowHowTo={false}
          __experimentalExpandOnFocus
        />
      </VStack>
    </PanelBody>
  );
}

/**
 * Higher-order component to add post picker to Query Loop block
 */
interface BlockEditComponentProps {
  name: string;
  attributes: BlockAttributes;
  setAttributes: (attrs: Partial<BlockAttributes>) => void;
}

const withPostPicker = createHigherOrderComponent(
  (BlockEdit: React.ComponentType<BlockEditComponentProps>) =>
    function BlockEditWithPostPicker(props: BlockEditComponentProps) {
      if (props.name !== "core/query") {
        return <BlockEdit {...props} />;
      }

      return (
        <>
          <BlockEdit {...props} />
          <InspectorControls>
            <PostPickerPanel
              attributes={props.attributes}
              setAttributes={props.setAttributes}
            />
          </InspectorControls>
        </>
      );
    },
  "withPostPicker"
);

/**
 * Register the filters
 */
addFilter(
  "editor.BlockEdit",
  "cherry-pick-for-query-loop/post-picker",
  withPostPicker,
  999
);
