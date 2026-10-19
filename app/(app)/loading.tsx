import { SkeletonPage } from '@/components/ui/skeleton'

/**
 * Every page in the workspace sits inside this Suspense boundary, so a click
 * paints the shape of the next screen immediately instead of holding the old
 * one still until the server answers. The shared layout stays interactive.
 */
export default function Loading() {
  return <SkeletonPage />
}
