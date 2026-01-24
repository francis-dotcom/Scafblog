// import React, {memo, type ReactNode} from 'react';
// import {useThemeConfig} from '@docusaurus/theme-common';
// import {groupBlogSidebarItemsByYear} from '@docusaurus/plugin-content-blog/client';
// import Heading from '@theme/Heading';
// import type {Props} from '@theme/BlogSidebar/Content';

// function BlogSidebarYearGroup({
//   year,
//   yearGroupHeadingClassName,
//   children,
// }: {
//   year: string;
//   yearGroupHeadingClassName?: string;
//   children: ReactNode;
// }) {
//   return (
//     <div role="group">
//       <Heading as="h3" className={yearGroupHeadingClassName}>
//         {year}
//       </Heading>
//       {children}
//     </div>
//   );
// }

// function BlogSidebarContent({
//   items,
//   yearGroupHeadingClassName,
//   ListComponent,
// }: Props): ReactNode {
//   const themeConfig = useThemeConfig();
//   if (themeConfig.blog.sidebar.groupByYear) {
//     const itemsByYear = groupBlogSidebarItemsByYear(items);
//     return (
//       <>
//         {itemsByYear.map(([year, yearItems]) => (
//           <BlogSidebarYearGroup
//             key={year}
//             year={year}
//             yearGroupHeadingClassName={yearGroupHeadingClassName}>
//             <ListComponent items={yearItems} />
//           </BlogSidebarYearGroup>
//         ))}
//       </>
//     );
//   } else {
//     return <ListComponent items={items} />;
//   }
// }

// export default memo(BlogSidebarContent);

import React, { memo, useState, type ReactNode } from "react";
import { useThemeConfig } from "@docusaurus/theme-common";
import { groupBlogSidebarItemsByYear } from "@docusaurus/plugin-content-blog/client";
import Heading from "@theme/Heading";
import type { Props } from "@theme/BlogSidebar/Content";
import styles from "./styles.module.css";

function BlogSidebarYearGroup({
  year,
  yearGroupHeadingClassName,
  children,
  items,
  ListComponent,
}: {
  year: string;
  yearGroupHeadingClassName?: string;
  children?: ReactNode;
  items: any[];
  ListComponent: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 2;
  const hasMore = items.length > LIMIT;
  const displayedItems = expanded ? items : items.slice(0, LIMIT);

  return (
    <div role="group">
      <Heading as="h3" className={yearGroupHeadingClassName}>
        {year}
      </Heading>
      <ListComponent items={displayedItems} />
      {hasMore && (
        <button
          type="button"
          className={styles.showMoreButton}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "↑ Show less" : `↓ Show ${items.length - LIMIT} more`}
        </button>
      )}
    </div>
  );
}

function BlogSidebarContent({
  items,
  yearGroupHeadingClassName,
  ListComponent,
}: Props): ReactNode {
  const themeConfig = useThemeConfig();
  if (themeConfig.blog.sidebar.groupByYear) {
    const itemsByYear = groupBlogSidebarItemsByYear(items);
    return (
      <>
        {itemsByYear.map(([year, yearItems]) => (
          <BlogSidebarYearGroup
            key={year}
            year={year}
            yearGroupHeadingClassName={yearGroupHeadingClassName}
            items={yearItems}
            ListComponent={ListComponent}
          />
        ))}
      </>
    );
  } else {
    return <ListComponent items={items} />;
  }
}

export default memo(BlogSidebarContent);
