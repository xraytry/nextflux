import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { PhotoProvider } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import "./ArticleView.css";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import ActionButtons from "@/components/ArticleView/components/ActionButtons.jsx";
import { generateReadableDate } from "@/lib/format.js";
import { activeArticle, filteredArticles } from "@/stores/articlesStore.js";
import { Chip, Divider } from "@nextui-org/react";
import EmptyPlaceholder from "@/components/ArticleList/components/EmptyPlaceholder";
import { cn, getFontSizeClass } from "@/lib/utils";
import ArticleImage from "@/components/ArticleView/components/ArticleImage.jsx";
import parse from "html-react-parser";
import { settingsState } from "@/stores/settingsStore";
import { AnimatePresence, motion } from "framer-motion";
import MediaPlayer from "@/components/ArticleView/components/MediaPlayer.jsx";
import AudioPlayer from "@/components/ArticleView/components/AudioPlayer.jsx";
import { cleanTitle } from "@/lib/utils";

const ArticleView = () => {
  const { articleId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const $filteredArticles = useStore(filteredArticles);
  const $activeArticle = useStore(activeArticle);
  const {
    lineHeight,
    fontSize,
    maxWidth,
    alignJustify,
    fontFamily,
    titleFontSize,
    titleAlignType,
  } = useStore(settingsState);
  const scrollAreaRef = useRef(null);

  // 监听文章ID变化,滚动到顶部
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (viewport) {
        viewport.scrollTo({
          top: 0,
          behavior: "instant", // 使用 instant 避免与动画冲突
        });
      }
    }
  }, [articleId]);

  useEffect(() => {
    const loadArticleByArticleId = async () => {
      if (articleId && $filteredArticles.length > 0) {
        setLoading(true);
        setError(null);
        try {
          const loadedArticle = $filteredArticles.find(
            (article) => article.id === parseInt(articleId),
          );
          if (loadedArticle) {
            activeArticle.set(loadedArticle);
          } else {
            setError("请选择要阅读的文章");
          }
        } catch (err) {
          console.error("加载文章失败:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    };

    loadArticleByArticleId();
  }, [$filteredArticles, articleId]);

  const handleLinkWithImg = (domNode) => {
    const imgNode = domNode.children.find(
      (child) => child.type === "tag" && child.name === "img",
    );

    if (imgNode) {
      const hostname =
        new URL(domNode.attribs.href).hostname || domNode.attribs.href;
      return (
        <>
          <ArticleImage imgNode={imgNode} />
          <div className="flex justify-center">
            <Chip
              color="primary"
              variant="flat"
              size="sm"
              classNames={{ base: "cursor-pointer my-2" }}
              onClick={() => {
                window.open(domNode.attribs.href, "_blank");
              }}
            >
              {hostname}...
            </Chip>
          </div>
        </>
      );
    }
    return domNode;
  };

  // 检查是否有音频附件
  const audioEnclosure = $activeArticle?.enclosures?.find((enclosure) =>
    enclosure.mime_type?.startsWith("audio/"),
  );

  if (loading || !$activeArticle || error) {
    return <EmptyPlaceholder />;
  }

  return (
    <div
      className={cn(
        "flex-1 bg-content2 p-0 sm:p-2 h-screen fixed sm:static inset-0 z-50",
        "animate-slide-in-from-right motion-reduce:animate-none",
      )}
    >
      <ScrollArea
        ref={scrollAreaRef}
        type="auto"
        className="article-scroll-area h-full bg-background rounded-none sm:rounded-lg shadow-none sm:shadow-small"
      >
        <ActionButtons articleId={$activeArticle?.id} />
        <div
          className="article-view-content px-5 py-20 w-full mx-auto"
          style={{
            maxWidth: `${maxWidth}ch`,
            fontFamily: fontFamily,
          }}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={$activeArticle?.id}
              initial={{ y: 50, opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                transition: {
                  type: "spring",
                  bounce: 0.3,
                  opacity: { delay: 0.05 },
                },
              }}
              exit={{ y: -20, opacity: 0 }}
            >
              <header
                className="article-header"
                style={{ textAlign: titleAlignType }}
              >
                <div className="text-muted-foreground text-sm">
                  {$activeArticle?.feed?.title}
                </div>
                <h1
                  className="font-bold my-2 hover:cursor-pointer leading-tight"
                  style={{
                    fontSize: `${titleFontSize * fontSize}px`,
                  }}
                  onClick={() => window.open($activeArticle?.url, "_blank")}
                >
                  {cleanTitle($activeArticle?.title)}
                </h1>
                <div className="text-muted-foreground text-sm">
                  <time dateTime={$activeArticle?.published_at}>
                    {generateReadableDate($activeArticle?.published_at)}
                  </time>
                </div>
              </header>
              <Divider className="my-4" />
              {audioEnclosure && <AudioPlayer source={audioEnclosure} />}
              <PhotoProvider
                maskOpacity={0.5}
                bannerVisible={false}
                maskClassName="backdrop-blur"
              >
                <motion.div
                  className={cn(
                    "article-content prose dark:prose-invert max-w-none",
                    getFontSizeClass(fontSize),
                  )}
                  style={{
                    lineHeight: lineHeight + "em",
                    textAlign: alignJustify ? "justify" : "left",
                  }}
                  key={$activeArticle?.id}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    transition: {
                      type: "spring",
                      bounce: 0.3,
                      opacity: { delay: 0.05 },
                    },
                  }}
                  exit={{ y: -20, opacity: 0 }}
                >
                  {parse($activeArticle?.content, {
                    replace(domNode) {
                      if (domNode.type === "tag" && domNode.name === "img") {
                        return <ArticleImage imgNode={domNode} />;
                      }
                      if (domNode.type === "tag" && domNode.name === "a") {
                        return domNode.children.length > 0
                          ? handleLinkWithImg(domNode)
                          : domNode;
                      }
                      if (domNode.type === "tag" && domNode.name === "video") {
                        // 查找 source 子元素
                        const sourceNode = domNode.children?.find(
                          (child) =>
                            child.type === "tag" && child.name === "source",
                        );

                        // 如果找到 source 元素,使用其属性
                        if (sourceNode?.attribs) {
                          return (
                            <MediaPlayer
                              src={sourceNode.attribs.src}
                              type={sourceNode.attribs.type}
                            />
                          );
                        }

                        return domNode;
                      }
                      if (domNode.type === "tag" && domNode.name === "iframe") {
                        const { src } = domNode.attribs;

                        // 判断是否为 YouTube iframe
                        const isYouTube =
                          src &&
                          (src.includes("youtube.com/embed") ||
                            src.includes("youtu.be") ||
                            src.includes("youtube-nocookie.com/embed"));

                        // 如果不是 YouTube iframe,直接返回原始节点
                        if (!isYouTube) {
                          return domNode;
                        }

                        // YouTube iframe 显示打开链接的按钮
                        return <MediaPlayer src={src} type="youtube" />;
                      }
                    },
                  })}
                </motion.div>
              </PhotoProvider>
            </motion.div>
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ArticleView;
